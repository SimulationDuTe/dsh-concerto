/**
 * 团队数据 -> teams bundle 文件（纯生成 + 落盘 + 哈希）。
 * 不安装、不改 profile：安装只在重载端点里发生。
 * 设计：ADR-27 / §17.5
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildPresetBundle } from './projection/team_preset.mjs'

/** 对一组文件算稳定哈希：文件名 + 内容，按文件名排序。 */
export function hashFiles(files) {
  const h = createHash('sha256')
  for (const name of Object.keys(files).sort()) {
    h.update(name)
    h.update('\u0000')
    h.update(files[name])
    h.update('\u0000')
  }
  return `sha256:${h.digest('hex')}`
}

/** 纯生成：团队数组 -> { ok, files, hash }（不写盘）。 */
export function buildTeamBundleFiles(teams) {
  const built = buildPresetBundle(teams)
  if (!built.ok) return { ok: false, errors: built.errors }
  return { ok: true, files: built.files, hash: hashFiles(built.files) }
}

/** 写盘（幂等）。 */
export async function writeTeamBundle(dir, files) {
  await mkdir(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf8')
  }
  return dir
}

/** 读回磁盘内容，用于确认写入真的落盘；缺文件返回 null。 */
export async function readTeamBundleFiles(dir, names) {
  const files = {}
  for (const name of names) {
    try {
      files[name] = await readFile(join(dir, name), 'utf8')
    } catch {
      return null
    }
  }
  return files
}
