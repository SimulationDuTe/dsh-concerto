import { dispatchBudget } from '../lib/domain/dispatch_limits.mjs'
import { isTerminalTask, TASK_STATE } from '../lib/domain/state_machine.mjs'
import { DEFAULT_RUNTIME_PATH, readRuntimeSnapshot } from '../lib/runtime_storage.mjs'

const UNKNOWN = 'unknown'
const HEADER = 'runId,endToEndMs,accepted,reworks,manualOps'

function reworksForRun(tasks) {
  if (!Array.isArray(tasks)) return UNKNOWN
  let count = 0
  for (const task of tasks) {
    if (Number.isSafeInteger(task.reworkCount) && task.reworkCount >= 0) {
      count += task.reworkCount
    } else if (task.reworkCount == null && Array.isArray(task.events)) {
      count += dispatchBudget(task, {}).reworks
    } else {
      return UNKNOWN
    }
  }
  return count
}

function runMetric({ sessionId, goalCompletion, events, tasks }) {
  const closed = goalCompletion?.state === 'completed'
  const bound = events?.find((event) => event.type === 'session.bound' && event.payload?.roleKind === 'commander')
  const start = Date.parse(bound?.recordedAt)
  const end = Date.parse(goalCompletion?.finishedAt)
  const endToEndMs = closed && Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : UNKNOWN
  const accepted = closed && tasks?.length > 0 && tasks.every((task) => isTerminalTask(task.state))
    ? tasks.every((task) => task.state === TASK_STATE.completed) : UNKNOWN
  // Cross-client manual actions are measured by the trial observer.
  return [sessionId, endToEndMs, accepted, reworksForRun(tasks), UNKNOWN]
}

function csvCell(value) {
  const text = String(value)
  return /[,"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const [statePath = DEFAULT_RUNTIME_PATH, runId] = process.argv.slice(2)
try {
  const snapshot = readRuntimeSnapshot(statePath)
  if (!Array.isArray(snapshot.sessions)) throw new Error('runtime.sessions must be an array')
  const runs = snapshot.sessions.filter((run) => typeof run?.sessionId === 'string' && run.sessionId && (!runId || run.sessionId === runId))
  if (runId && runs.length === 0) throw new Error(`run not found: ${runId}`)
  process.stdout.write([HEADER, ...runs.map((run) => runMetric(run).map(csvCell).join(','))].join('\r\n') + '\r\n')
} catch (error) {
  console.error(`Cannot export Concerto run metrics: ${error.message}`)
  process.exitCode = 1
}
