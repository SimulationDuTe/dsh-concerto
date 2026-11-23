import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, statSync } from 'node:fs'
import os from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

export const workspaceKey = (path) => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path)
export function scopesOverlap(a, b) {
  if (!a || !b) return false
  const contains = (root, child) => {
    const part = relative(workspaceKey(root), workspaceKey(child))
    return part === '' || (part !== '..' && !part.startsWith('..' + sep) && !isAbsolute(part))
  }
  return contains(a, b) || contains(b, a)
}

function runGit(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function realDirPath(value) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    return realpathSync(value.trim())
  } catch {
    return resolve(value.trim())
  }
}

function sanitizeGitSlug(value, fallback = 'item') {
  const cleaned = String(value ?? '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return cleaned || fallback
}

function parsePorcelainStatus(raw) {
  const records = String(raw ?? '').split('\0')
  let stagedCount = 0
  let unstagedCount = 0
  let untrackedCount = 0
  const dirtyFiles = []
  let totalDirtyCount = 0
  for (let i = 0; i < records.length; i += 1) {
    const entry = records[i]
    if (!entry || entry.length < 4) continue
    const x = entry[0]
    const y = entry[1]
    const file = entry.slice(3)
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') i += 1
    totalDirtyCount += 1
    if (x === '?' && y === '?') {
      untrackedCount += 1
      if (dirtyFiles.length < 50) dirtyFiles.push({ status: 'untracked', path: file })
      continue
    }
    if (x !== ' ' && x !== '?') stagedCount += 1
    if (y !== ' ') unstagedCount += 1
    if (dirtyFiles.length < 50) {
      dirtyFiles.push({ status: `${x}${y}`.trim() || 'modified', path: file })
    }
  }
  return {
    dirty: totalDirtyCount > 0,
    stagedCount,
    unstagedCount,
    untrackedCount,
    totalDirtyCount,
    dirtyFiles,
  }
}

export function inspectGitWorkspace(cwd) {
  if (typeof cwd !== 'string' || !cwd.trim()) {
    return { isGit: false, available: false, reason: 'missing_directory', detail: 'working directory is empty' }
  }
  const target = realDirPath(cwd)
  try {
    if (!existsSync(target) || !statSync(target).isDirectory()) {
      return { isGit: false, available: false, reason: 'missing_directory', detail: `directory not found: ${target}` }
    }
  } catch (error) {
    return { isGit: false, available: false, reason: 'missing_directory', detail: String(error?.message || error) }
  }

  let repositoryRoot
  try {
    repositoryRoot = realDirPath(runGit(target, ['rev-parse', '--show-toplevel']).trim())
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { isGit: false, available: false, reason: 'git_unavailable', detail: 'git executable unavailable' }
    }
    return { isGit: false, available: false, reason: 'not_git_repository', detail: String(error?.stderr || error?.message || 'not a git repository').trim() }
  }

  let baseCommit
  try {
    baseCommit = runGit(repositoryRoot, ['rev-parse', '--verify', 'HEAD']).trim()
  } catch (error) {
    return {
      isGit: true,
      available: false,
      reason: 'unborn_head',
      repositoryRoot,
      dirty: false,
      detail: String(error?.stderr || error?.message || 'git repository has no HEAD commit yet').trim(),
    }
  }

  let baseBranch = 'HEAD'
  try {
    baseBranch = runGit(repositoryRoot, ['rev-parse', '--abbrev-ref', 'HEAD']).trim() || 'HEAD'
  } catch { /* detached or minimal repo */ }

  let statusInfo = { dirty: false, stagedCount: 0, unstagedCount: 0, untrackedCount: 0, totalDirtyCount: 0, dirtyFiles: [] }
  try {
    const rawStatus = runGit(repositoryRoot, ['status', '--porcelain=v1', '-uall', '-z'])
    statusInfo = parsePorcelainStatus(rawStatus)
  } catch (error) {
    return {
      isGit: true,
      available: false,
      reason: 'status_failed',
      repositoryRoot,
      baseCommit,
      baseBranch,
      detail: String(error?.stderr || error?.message || 'failed to inspect git status').trim(),
    }
  }

  return {
    isGit: true,
    available: true,
    repositoryRoot,
    baseCommit,
    baseBranch,
    ...statusInfo,
  }
}

export function createGitWorktree({ repositoryRoot, baseCommit, taskId, executionId }) {
  const repoRoot = realDirPath(repositoryRoot)
  if (!repoRoot || !baseCommit) {
    return { ok: false, reason: 'worktree_create_failed', detail: 'repositoryRoot and baseCommit are required' }
  }
  const branch = `concerto/${sanitizeGitSlug(taskId, 'task').slice(0, 40)}/${sanitizeGitSlug(executionId, 'exec').slice(-16)}`
  let parentDir = ''
  try {
    const tmpRoot = realpathSync(os.tmpdir())
    parentDir = realpathSync(mkdtempSync(join(tmpRoot, 'concerto-wt-')))
    const targetPath = join(parentDir, 'repo')
    runGit(repoRoot, ['worktree', 'add', '-b', branch, targetPath, baseCommit])
    const realWorktreePath = realpathSync(targetPath)
    if (scopesOverlap(repoRoot, realWorktreePath)) {
      removeGitWorktree({ repositoryRoot: repoRoot, path: realWorktreePath, branch })
      return { ok: false, reason: 'worktree_create_failed', detail: 'created worktree overlaps repository root' }
    }
    return {
      ok: true,
      worktree: {
        executionId: String(executionId || ''),
        repositoryRoot: repoRoot,
        path: realWorktreePath,
        branch,
        baseCommit,
        headCommit: baseCommit,
      },
    }
  } catch (error) {
    if (parentDir) {
      try { rmSync(parentDir, { recursive: true, force: true }) } catch { /* best-effort cleanup */ }
    }
    return {
      ok: false,
      reason: 'worktree_create_failed',
      detail: String(error?.stderr || error?.message || 'git worktree add failed').trim(),
    }
  }
}

export async function createGitWorktreeWithHost({ repositoryRoot, baseCommit, taskId, executionId, hostWorktrees = null }) {
  if (hostWorktrees?.concertoVerified === true && typeof hostWorktrees.create === 'function') {
    const repoRoot = realDirPath(repositoryRoot)
    const branch = `concerto/${sanitizeGitSlug(taskId, 'task').slice(0, 40)}/${sanitizeGitSlug(executionId, 'exec').slice(-16)}`
    try {
      const created = await hostWorktrees.create({ repositoryRoot: repoRoot, baseCommit, branch, taskId, executionId })
      const createdPath = realDirPath(created?.path)
      if (!createdPath || !existsSync(createdPath) || scopesOverlap(repoRoot, createdPath)) {
        return { ok: false, reason: 'worktree_create_failed', detail: 'host worktree API returned an invalid or overlapping path' }
      }
      let headCommit = baseCommit
      try { headCommit = runGit(createdPath, ['rev-parse', '--verify', 'HEAD']).trim() || baseCommit } catch { /* keep baseCommit */ }
      return {
        ok: true,
        worktree: {
          executionId: String(executionId || ''),
          repositoryRoot: repoRoot,
          path: createdPath,
          branch: String(created?.branch || branch),
          baseCommit: String(created?.baseCommit || baseCommit),
          headCommit,
          hostManaged: true,
        },
      }
    } catch (error) {
      return { ok: false, reason: 'worktree_create_failed', detail: String(error?.message || error) }
    }
  }
  return createGitWorktree({ repositoryRoot, baseCommit, taskId, executionId })
}

export function inspectGitWorktreeDelivery(worktree) {
  if (!worktree || typeof worktree.path !== 'string' || !worktree.path) return worktree ?? null
  const wtPath = realDirPath(worktree.path)
  if (!existsSync(wtPath)) return { ...worktree }
  let headCommit = worktree.headCommit || worktree.baseCommit || ''
  try {
    headCommit = runGit(wtPath, ['rev-parse', '--verify', 'HEAD']).trim() || headCommit
  } catch { /* keep previous */ }
  let committedFiles = []
  if (worktree.baseCommit && headCommit && worktree.baseCommit !== headCommit) {
    try {
      committedFiles = runGit(wtPath, ['diff', '--name-only', `${worktree.baseCommit}..${headCommit}`])
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 100)
    } catch { /* keep empty */ }
  }
  let uncommittedFiles = []
  try {
    const status = parsePorcelainStatus(runGit(wtPath, ['status', '--porcelain=v1', '-uall', '-z']))
    uncommittedFiles = status.dirtyFiles.map((entry) => entry.path)
  } catch { /* keep empty */ }
  return {
    ...worktree,
    headCommit,
    diffRange: worktree.baseCommit && headCommit ? `${worktree.baseCommit}..${headCommit}` : null,
    committedFiles,
    uncommittedFiles,
  }
}

export function removeGitWorktree(worktree) {
  if (!worktree?.path) return false
  const wtPath = realDirPath(worktree.path)
  const repoRoot = worktree.repositoryRoot ? realDirPath(worktree.repositoryRoot) : ''
  try {
    if (repoRoot && existsSync(repoRoot)) {
      try { runGit(repoRoot, ['worktree', 'remove', '--force', wtPath]) } catch { /* continue cleanup */ }
      if (worktree.branch) {
        try { runGit(repoRoot, ['branch', '-D', worktree.branch]) } catch { /* best effort */ }
      }
      try { runGit(repoRoot, ['worktree', 'prune']) } catch { /* best effort */ }
    }
    const parent = resolve(wtPath, '..')
    if (parent.includes('concerto-wt-') && scopesOverlap(os.tmpdir(), parent)) {
      rmSync(parent, { recursive: true, force: true })
    } else if (scopesOverlap(os.tmpdir(), wtPath)) {
      rmSync(wtPath, { recursive: true, force: true })
    }
    return true
  } catch {
    return false
  }
}

export function inspectGitWorktreeDiff(worktree, { maxChars = 24000 } = {}) {
  if (!worktree?.path) return { ok: false, code: 'not_found', detail: '任务未绑定 Git Worktree' }
  const wtPath = realDirPath(worktree.path)
  if (!existsSync(wtPath)) return { ok: false, code: 'not_found', detail: 'Worktree 目录已不存在或已被清理' }
  try {
    const headCommit = runGit(wtPath, ['rev-parse', '--verify', 'HEAD']).trim()
    const base = worktree.baseCommit || headCommit
    const stat = base ? runGit(wtPath, ['diff', '--stat', base]).trim() : ''
    let rawDiff = base ? runGit(wtPath, ['diff', base]) : ''
    const status = parsePorcelainStatus(runGit(wtPath, ['status', '--porcelain=v1', '-uall', '-z']))
    const untrackedFiles = status.dirtyFiles.filter((f) => f.status === 'untracked').map((f) => f.path)
    const truncated = rawDiff.length > maxChars
    if (truncated) rawDiff = `${rawDiff.slice(0, maxChars)}\n...（Diff 超过 ${maxChars} 字符已截断）`
    return { ok: true, baseCommit: base, headCommit, stat, diff: rawDiff, untrackedFiles, truncated }
  } catch (error) {
    return { ok: false, code: 'invalid', detail: `读取 Worktree Diff 失败：${error?.message || error}` }
  }
}

export function mergeGitWorktree(worktree) {
  if (!worktree?.path || !worktree?.repositoryRoot) {
    return { ok: false, code: 'not_found', detail: '任务未绑定可合并的 Git Worktree' }
  }
  const wtPath = realDirPath(worktree.path)
  const repoRoot = realDirPath(worktree.repositoryRoot)
  if (!existsSync(wtPath) || !existsSync(repoRoot)) {
    return { ok: false, code: 'not_found', detail: 'Worktree 或主仓库目录不存在' }
  }
  try {
    const mainStatus = parsePorcelainStatus(runGit(repoRoot, ['status', '--porcelain=v1', '-uall', '-z']))
    if (mainStatus.dirty) {
      return { ok: false, code: 'precondition_failed', detail: `主工作区存在 ${mainStatus.dirtyFiles.length} 项未提交改动，请先提交或暂存后再合并` }
    }
    const wtStatus = parsePorcelainStatus(runGit(wtPath, ['status', '--porcelain=v1', '-uall', '-z']))
    if (wtStatus.dirty) {
      runGit(wtPath, ['add', '-A'])
      runGit(wtPath, ['-c', 'user.name=Concerto', '-c', 'user.email=concerto@local', 'commit', '-m', `Concerto worktree delivery (${worktree.branch || 'task'})`])
    }
    const headCommit = runGit(wtPath, ['rev-parse', '--verify', 'HEAD']).trim()
    if (worktree.baseCommit && headCommit === worktree.baseCommit) {
      return { ok: true, noop: true, mergedCommit: headCommit, detail: 'Worktree 相比基线无新改动，无需合并' }
    }
    const targetRef = worktree.branch || headCommit
    try {
      runGit(repoRoot, ['merge', '--no-ff', '-m', `Merge Concerto worktree ${targetRef}`, targetRef])
    } catch (mergeErr) {
      try { runGit(repoRoot, ['merge', '--abort']) } catch { /* ignore */ }
      return { ok: false, code: 'conflict', detail: `合并存在冲突并已自动中止：${mergeErr?.message || mergeErr}` }
    }
    const mergedCommit = runGit(repoRoot, ['rev-parse', '--verify', 'HEAD']).trim()
    return { ok: true, mergedCommit, branch: worktree.branch || null }
  } catch (error) {
    return { ok: false, code: 'invalid', detail: `合并 Worktree 失败：${error?.message || error}` }
  }
}

export function ensureDirIfMissing(dir) {
  mkdirSync(dir, { recursive: true })
}
