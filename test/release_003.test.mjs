import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTeamRuntime } from '../packages/dsh-concerto/lib/team_runtime.mjs'
import { createTaskRunner } from '../packages/dsh-concerto/lib/runner.mjs'
import { scopesOverlap } from '../packages/dsh-concerto/lib/workspace_scope.mjs'

const payload = {title:'Task',objective:'Deliver',acceptance:['Artifact'],constraints:[],dependsOn:[],assigneeRole:'worker'}
function seed(rt, scope='run') { rt.submit({decisionId:'d1',expectedPlanRevision:1,action:'create_task',payload},scope) }
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms))

test('0.0.2 slash event migration preserves ids/seq, supports old connector ingress', () => {
  const statePath=join(mkdtempSync(join(tmpdir(),'concerto-migrate-')),'runtime.json')
  const rt=createTeamRuntime({statePath});seed(rt)
  const id=rt.startExecution('run','task-1',{memberId:'w',connectorId:'codex'}).executionId
  rt.recordExecutionEvent('run','task-1',{type:'output/message',text:'legacy'},id)
  const saved=JSON.parse(readFileSync(statePath,'utf8'))
  const event=saved.sessions[0].events.at(-1)
  event.type='output/message'
  writeFileSync(statePath,JSON.stringify(saved))
  const restored=createTeamRuntime({statePath}).getStatus('run').events.find(e=>e.eventId===event.eventId)
  assert.equal(restored.type,'output.message');assert.equal(restored.originalType,'output/message');assert.equal(restored.seq,event.seq)
})

for (const policyRequiresReview of [false,true]) test(`decline blocks task even if turn completed, review floor=${policyRequiresReview}`,()=>{
  const rt=createTeamRuntime({policyRequiresReview});seed(rt)
  const id=rt.startExecution('run','task-1',{memberId:'w',connectorId:'codex'}).executionId
  rt.recordExecutionEvent('run','task-1',{type:'approval.requested',requestId:'0',payload:{command:'write'},observedAt:new Date().toISOString(),elapsedMs:120000},id)
  rt.decideRequest('run',{requestId:`${id}:0`,commandId:'deny',answer:{decision:'decline'}})
  rt.delivery('run',`${id}:0`,true)
  rt.settleExecution('run','task-1',id,{status:'completed',text:'could not write'})
  const snap=rt.getStatus('run')
  assert.equal(snap.executions[0].state,'finished');assert.equal(snap.tasks[0].state,'blocked')
  assert.equal(snap.tasks[0].result.outcome,'approval_denied')
  assert.equal(snap.executions[0].metrics.firstApprovalMs,120000)
  assert.ok(snap.events.every(e=>!e.type.includes('/')))
  assert.ok(snap.events.some(e=>e.type==='task.blocked'))
})

test('hosted timeout records phase and Unknown; late completion cannot falsely release workspace',async()=>{
  const rt=createTeamRuntime();seed(rt)
  const native=Promise.withResolvers()
  let signal
  const runner=createTaskRunner({runtime:rt,registry:{},defaultCwd:process.cwd(),hostedTimeoutMs:20,
    hostedStart:input=>{signal=input.signal;input.onPhase('hosted.wait_idle');return native.promise}})
  runner.dispatch({scope:'run',taskId:'task-1',hosted:{memberId:'w',agentPreset:'p'}})
  await delay(60)
  assert.equal(signal.aborted,true)
  assert.equal(rt.getStatus('run').tasks[0].viewState,'unknown')
  assert.match(rt.getStatus('run').tasks[0].blockedReason,/hosted.wait_idle/)
  native.resolve({ok:true});await delay(10)
  assert.equal(rt.getStatus('run').executions[0].state,'unknown')
})

test('confirmed failure needs native evidence and is idempotent; client booleans cannot unlock',()=>{
  const rt=createTeamRuntime();seed(rt)
  const id=rt.startExecution('run','task-1',{memberId:'w',connectorId:'hosted:w'}).executionId
  rt.settleExecution('run','task-1',id,{status:'unknown'})
  const input={taskId:'task-1',executionId:id,commandId:'adjudicate',action:'confirm_failed',reason:'native stop checked',stopConfirmed:true}
  assert.equal(rt.adjudicate('run',input,{kind:'user',id:'owner'}).ok,false)
  const evidence={kind:'hosted_idle',sessionId:'native',observedAt:new Date().toISOString()}
  assert.equal(rt.adjudicate('run',input,{kind:'user',id:'owner'},evidence).state,'failed')
  assert.equal(rt.getStatus('run').executions[0].state,'stopped')
  assert.equal(rt.adjudicate('run',input,undefined,evidence).replayed,true)
})

test('isolated retry retains original reservation and rejects stale results / cwd / unbounded sandbox',()=>{
  const rt=createTeamRuntime();seed(rt)
  const old=join(tmpdir(),'old-concerto'),fresh=join(tmpdir(),'new-concerto')
  const id=rt.startExecution('run','task-1',{memberId:'w',connectorId:'codex',sandbox:'workspace-write',writeScope:old}).executionId
  rt.settleExecution('run','task-1',id,{status:'unknown'})
  const input={taskId:'task-1',executionId:id,commandId:'isolate',action:'retry_isolated',reason:'checked side effects',externalEffectsReviewed:true}
  assert.equal(rt.adjudicate('run',input,undefined,{kind:'fresh_directory',cwd:old}).ok,false)
  assert.equal(rt.adjudicate('run',input,undefined,{kind:'fresh_directory',cwd:fresh}).state,'pending')
  assert.equal(rt.getStatus('run').executions[0].state,'unknown')
  assert.equal(rt.startExecution('run','task-1',{writeScope:old}).ok,false)
  const binding={memberId:'w',connectorId:'codex',sandbox:'workspace-write',approvals:'ask',writeScope:fresh}
  assert.equal(rt.startExecution('run','task-1',{...binding,sandbox:'danger-full-access'}).ok,false)
  const next=rt.startExecution('run','task-1',binding)
  assert.equal(next.ok,true)
  assert.equal(rt.settleExecution('run','task-1',id,{status:'completed',text:'late'}).code,'stale')
  seed(rt,'other')
  assert.equal(rt.startExecution('other','task-1',{writeScope:old}).ok,false)
  assert.equal(scopesOverlap(old,join(old,'child')),true)
})
