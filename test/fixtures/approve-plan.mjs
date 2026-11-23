import assert from 'node:assert/strict'

export async function proposeFixturePlan(callTool, sessionId, expectedVersion) {
  const plan = await callTool('publish_view_object', sessionId, {
    id: 'kickoff-plan', type: 'checklist', title: 'Kickoff plan',
    data: { items: [{ label: 'Deliver and verify the requested work' }] },
    ...(expectedVersion === undefined ? {} : { expectedVersion }),
  })
  assert.equal(plan.ok, true, JSON.stringify(plan))
  const { planRevision } = await callTool('get_team_status', sessionId)
  const proposed = await callTool('submit_decision', sessionId, {
    decisionId: `propose-kickoff-${sessionId}-${plan.version}`,
    expectedPlanRevision: planRevision,
    action: 'propose_plan',
    payload: { planId: plan.id, planVersion: plan.version },
  })
  assert.equal(proposed.ok, true, JSON.stringify(proposed))
  return proposed
}

export async function approveFixturePlan(callTool, request, sessionId) {
  const proposed = await proposeFixturePlan(callTool, sessionId)
  const approved = await request('/concerto/runs/approve-plan', {
    sessionId, proposalId: proposed.result.proposalId, commandId: 'confirm-kickoff',
  })
  assert.equal(approved.status, 200, JSON.stringify(approved.value))
  return proposed.planRevision
}
