import { checkSkillEligibility } from './runtime_skills.mjs'
import { resolveSemanticKind } from './view_objects.mjs'

export const PROJECT_CONTEXT_KINDS = Object.freeze(['objective', 'decision', 'artifact', 'skill'])
const MAX_RESULTS = 8

function shortText(value, limit = 240) {
  const text = String(value ?? '').trim()
  return text.length > limit ? text.slice(0, limit - 1) + '…' : text
}

export function viewObjectVersion(run, id, version) {
  const current = run.viewObjects.get(id)
  if (version === undefined || current?.version === version) return current
  return run.viewObjectHistory.get(id)?.find((object) => object.version === version)
}

export function isProjectViewObject(object) {
  if (!object || object.taskId || object.executionId || object.roleKind === 'reviewer' ||
      (object.layer && object.layer !== 'team') || object.type === 'html') return false
  const { semanticKind } = resolveSemanticKind(object, object.data)
  return semanticKind === 'blueprint' || semanticKind === 'snapshot'
}

function viewRead(teamSessionId, id, version) {
  return { tool: 'read_view_object', args: { teamSessionId, id, version } }
}

function* runEntries(teamSessionId, run) {
  for (let index = run.events.length - 1; index >= 0; index--) {
    const event = run.events[index]
    if (event.type !== 'plan.approved' || event.actor?.kind !== 'user') continue
    const ref = event.payload?.planRef
    if (!ref?.id || ref.type === 'html' || !Number.isInteger(ref.version)) continue
    const view = viewObjectVersion(run, ref.id, ref.version)
    if (view && !isProjectViewObject(view)) continue
    yield {
      kind: 'decision', id: event.payload.proposalId, objectType: ref.type,
      title: ref.title || ref.id, summary: view?.caption || '用户已确认此计划版本',
      version: ref.version, source: { kind: 'plan.approved', teamSessionId, eventId: event.eventId },
      read: viewRead(teamSessionId, ref.id, ref.version),
      ...(!view ? { unavailable: true } : {}),
    }
  }

  const goal = run.goalCompletion
  if (goal?.state === 'completed') {
    yield {
      kind: 'decision', id: goal.goalId, title: '运行结项', summary: goal.summary,
      version: goal.planRevision ?? null, source: { kind: 'goal.finished', teamSessionId },
    }
  }

  for (const object of run.viewObjects.values()) {
    if (!isProjectViewObject(object)) continue
    yield {
      kind: 'artifact', id: object.id, objectType: object.type,
      title: object.title, summary: object.caption, version: object.version,
      source: { kind: 'view_object', teamSessionId, authorId: object.authorId },
      read: viewRead(teamSessionId, object.id, object.version),
    }
  }
}

function* projectEntries(projectId, runs, skills, memberContext) {
  const recentRuns = runs.toReversed()
  const objectiveRun = recentRuns.find(([, run]) => run.metadata?.objective)
  if (objectiveRun) {
    const [teamSessionId, { metadata }] = objectiveRun
    yield {
      kind: 'objective', id: projectId, title: '项目目标', summary: metadata.objective,
      version: metadata.configVersion ?? null,
      source: { kind: 'team_config', teamSessionId, teamId: metadata.teamId },
    }
  }

  for (const entry of skills) {
    const skill = entry.versions.get(entry.latestVersion)
    if (!checkSkillEligibility(skill, memberContext).eligible) continue
    yield {
      kind: 'skill', id: skill.id, title: skill.title, summary: skill.description,
      ...(skill.whenToUse ? { whenToUse: skill.whenToUse } : {}),
      version: skill.version, source: { kind: 'project_skill', projectId, authorId: skill.authorId },
      read: { tool: 'read_project_skill', args: { id: skill.id, version: skill.version } },
    }
  }

  for (const [teamSessionId, run] of recentRuns) yield* runEntries(teamSessionId, run)
}

export function searchProjectEntries(projectId, runs, skills, memberContext, { query = '', kind } = {}) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const entries = []
  for (const entry of projectEntries(projectId, runs, skills, memberContext)) {
    if (kind && entry.kind !== kind) continue
    const searchable = [entry.id, entry.kind, entry.objectType, entry.title, entry.summary, entry.whenToUse].join(' ').toLowerCase()
    if (!terms.every((term) => searchable.includes(term))) continue
    entries.push({
      ...entry, title: shortText(entry.title, 96), summary: shortText(entry.summary),
      ...(entry.whenToUse ? { whenToUse: shortText(entry.whenToUse, 160) } : {}),
    })
    if (entries.length === MAX_RESULTS) break
  }
  return entries
}
