export const EXPERIENCE_GUIDANCE = 'Use search_experience before recurring problems or retries, then record_experience if the result is reusable and you have evidence.'
export const EXPERIENCE_REVIEW_GUIDANCE = 'To confirm an independently checked observation from the experienceObservations in get_task, add its exact ref to submit_review.verifiedExperienceRefs and cite its bound evidence in evidenceRefs. Give the task verdict separately.'
export const EXPERIENCE_KINDS = Object.freeze(['success', 'failure'])
export const EXPERIENCE_FIELDS = Object.freeze({ problem: 180, conditions: 240, method: 400, result: 240 })
export const EXPERIENCE_LIMIT = 3
export const EXPERIENCE_EVIDENCE_LIMIT = 5

const fail = (code, detail) => ({ ok: false, code, detail })
const validText = (value, limit) => typeof value === 'string' && value.trim() && value.length <= limit

export function normalizeExperience(input) {
  const { mutationId, kind, evidenceRefs, basedOn } = input
  if (!validText(mutationId, 120)) return fail('invalid', 'mutationId must be a non-empty string up to 120 characters')
  if (!EXPERIENCE_KINDS.includes(kind)) return fail('invalid', 'kind must be success or failure')
  const normalized = { mutationId: mutationId.trim(), kind }
  for (const [field, limit] of Object.entries(EXPERIENCE_FIELDS)) {
    if (!validText(input[field], limit)) return fail('invalid', `${field} must be a non-empty string up to ${limit} characters`)
    normalized[field] = input[field].trim()
  }
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0 || evidenceRefs.length > EXPERIENCE_EVIDENCE_LIMIT ||
      !evidenceRefs.every((ref) => validText(ref, 240))) {
    return fail('invalid', `provide 1 to ${EXPERIENCE_EVIDENCE_LIMIT} evidence references`)
  }
  normalized.evidenceRefs = [...new Set(evidenceRefs.map((ref) => ref.trim()))]
  if (basedOn !== undefined) {
    if (!basedOn || !['experience', 'skill'].includes(basedOn.kind) || !validText(basedOn.id, 64) ||
        !Number.isInteger(basedOn.version) || basedOn.version < 1) return fail('invalid', 'basedOn requires kind, id, and a positive version')
    normalized.basedOn = { kind: basedOn.kind, id: basedOn.id, version: basedOn.version }
  }
  return { ok: true, normalized }
}

export function matchesObservedCommand(event, observation) {
  if (event.type !== 'command.completed') return false
  const { command, exitCode } = event.payload ?? {}
  return Number.isInteger(exitCode) && typeof command === 'string' && command.trim() === observation.method &&
    (exitCode === 0 ? 'success' : 'failure') === observation.kind &&
    [`exit code ${exitCode}`, `退出码 ${exitCode}`].includes(observation.result.toLowerCase())
}

export function experienceRecords(events) {
  const records = new Map()
  for (const event of events) {
    if (event.type === 'experience.recorded') {
      records.set(event.payload.ref, {
        ...event.payload, author: event.actor, recordedAt: event.recordedAt,
        source: { teamSessionId: event.teamSessionId, taskId: event.taskId, executionId: event.executionId },
      })
    }
    if (event.type === 'review.submitted') {
      const review = event.payload?.review
      for (const confirmation of review?.verifiedExperiences ?? []) {
        const observation = records.get(confirmation.ref)
        if (!observation) continue
        observation.proof = {
          kind: 'review', eventId: event.eventId, verdict: review.verdict, resultId: review.resultId,
          evidenceRefs: confirmation.evidenceRefs,
        }
      }
    }
  }
  return records
}

export function verifyReviewedExperiences(task, input, actor) {
  const { verifiedExperienceRefs, evidenceRefs } = input
  if (verifiedExperienceRefs === undefined) return { ok: true, observations: [] }
  if (!Array.isArray(verifiedExperienceRefs) || verifiedExperienceRefs.length > EXPERIENCE_EVIDENCE_LIMIT ||
      !verifiedExperienceRefs.every((ref) => validText(ref, 100))) return fail('invalid', 'invalid verifiedExperienceRefs')
  if (verifiedExperienceRefs.length === 0) return { ok: true, observations: [] }
  if (actor?.kind !== 'user' && !(actor?.kind === 'member' && ['reviewer', 'commander'].includes(actor.role))) {
    return fail('unauthorized', 'an independent reviewer or user must confirm an observation')
  }

  const cited = new Set(Array.isArray(evidenceRefs) ? evidenceRefs.filter((ref) => typeof ref === 'string').map((ref) => ref.trim()) : [])
  const records = experienceRecords(task.events ?? [])
  const observations = []
  for (const ref of new Set(verifiedExperienceRefs)) {
    const observation = records.get(ref)
    if (!observation || observation.targetExecutionId !== task.result?.executionId) {
      return fail('not_found', 'experience version not found for this candidate')
    }
    if (observation.author.kind === actor.kind && observation.author.id === actor.id) {
      return fail('unauthorized', 'the author cannot verify their own experience')
    }
    const matched = observation.boundRefs.filter((source) => cited.has(source))
    if (!matched.length) return fail('precondition_failed', 'cite a bound evidence reference for this experience')
    observations.push({ ref, evidenceRefs: matched })
  }
  return { ok: true, observations }
}

export function searchExperienceRecords(records, query, kind) {
  const latest = new Map()
  for (const record of records) {
    if (!record.proof) continue
    const current = latest.get(record.id)
    if (!current || record.version > current.version) latest.set(record.id, record)
  }
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return [...latest.values()]
    .filter((record) => {
      if (kind && record.kind !== kind) return false
      const text = [record.ref, record.problem, record.conditions, record.method, record.result].join(' ').toLowerCase()
      return terms.every((term) => text.includes(term))
    })
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, EXPERIENCE_LIMIT)
    .map(({ id, version, ref, kind, problem, conditions, method, result, basedOn, source, proof, author, recordedAt }) => ({
      type: 'experience', id, version, ref, kind, problem, conditions, method, result, source, proof, author, recordedAt,
      ...(basedOn ? { basedOn } : {}),
    }))
}
