import readline from 'node:readline'
const method = process.argv[2]
const send = (value) => process.stdout.write(JSON.stringify(value) + '\n')
let questionTurn = null
const finish = (id) => send({ method: 'turn/completed', params: { threadId: 'thread-fixture', turn: { id, status: 'completed' } } })
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line)
  if (message.method === 'initialize') send({ id: message.id, result: { userAgent: 'fixture' } })
  if (message.method === 'thread/start') send({ id: message.id, result: { thread: { id: 'thread-fixture' } } })
  if (message.method === 'turn/start') {
    if (method.startsWith('next_turn_')) {
      if (!questionTurn) {
        questionTurn = 'first-turn'
        send({ id: message.id, result: { turn: { id: questionTurn } } })
        return send({ id: 102, method: 'item/tool/call', params: { threadId: 'thread-fixture', turnId: questionTurn,
          tool: 'ask_task_question', arguments: { question: 'Which output format?' },
        } })
      }
      const context = JSON.parse(message.params.input[0].text.split('\n').at(-1))
      if (method === 'next_turn_rejected' || context.answer[0] !== 'GLB' || message.params.threadId !== 'thread-fixture') {
        return send({ id: message.id, error: { code: -32602, message: 'fixture rejected the next turn' } })
      }
      send({ id: message.id, result: { turn: { id: 'answer-turn' } } })
      return finish('answer-turn')
    }
    if (method === 'plan_question') {
      const { mode, settings } = message.params.collaborationMode ?? {}
      if (settings?.model !== 'fixture-model' || mode !== (questionTurn ? 'default' : 'plan')) {
        return send({ id: message.id, error: { code: -32602, message: 'unexpected collaboration mode or model' } })
      }
      if (questionTurn) {
        send({ id: message.id, result: { turn: { id: 'task-turn' } } })
        return finish('task-turn')
      }
      questionTurn = 'plan-turn'
      send({ id: message.id, result: { turn: { id: questionTurn } } })
      return send({ id: 101, method: 'item/tool/requestUserInput', params: { threadId: 'thread-fixture', turnId: questionTurn,
        questions: [{ id: 'q1', question: 'Which output format?' }],
      } })
    }
    send({ id: message.id, result: { turn: { id: 'turn-fixture' } } })
    if (method === 'exit') return process.exit(2)
    if (method === 'failed') return send({ method: 'turn/completed', params: { threadId: 'thread-fixture', turn: { id: 'turn-fixture', status: 'failed', error: { message: 'fixture failure' } } } })
    if (method === 'command_and_file') {
      send({
        method: 'item/completed',
        params: {
          item: {
            type: 'commandExecution',
            command: 'npm test',
            cwd: 'F:/CodingFolder/Concerto',
            exitCode: 0,
            status: 'completed',
            aggregatedOutput: 'x'.repeat(2100),
          },
        },
      })
      send({
        method: 'item/completed',
        params: {
          item: {
            type: 'fileChange',
            changes: [{ path: 'lib/client.js', kind: 'modify', added: 12, removed: 3 }],
          },
        },
      })
      send({ method: 'item/completed', params: { item: { type: 'agentMessage', text: 'done' } } })
      setTimeout(() => send({ method: 'turn/completed', params: { threadId: 'thread-fixture', turn: { id: 'turn-fixture', status: 'completed' } } }), 10)
      return
    }
    send({ id: 100, method, params: { threadId: 'thread-fixture', turnId: 'turn-fixture', itemId: 'item-fixture', command: 'echo fixture',
      ...(method === 'item/tool/requestUserInput' ? { questions: [{ id: 'q1', question: 'Choose?', options: [{ label: 'First', description: 'first' }] }] } : {}),
      ...(method === 'item/tool/call' ? {
        callId: 'call-fixture',
        tool: process.argv[3] || 'publish_view_object',
        arguments: process.argv[4] ? JSON.parse(process.argv[4]) : {
          id: 'worker-dag',
          type: 'diagram',
          title: 'Worker DAG',
          data: { layout: 'dag', nodes: [{ id: 'a', label: 'A', status: 'done' }] },
        },
      } : {}),
    } })
  }
  if (message.method === 'turn/interrupt') {
    send({ id: message.id, result: {} })
    send({ method: 'turn/completed', params: { threadId: 'thread-fixture', turn: { id: 'turn-fixture', status: 'interrupted' } } })
  }
  if (message.id === 100) {
    send({ method: 'item/completed', params: { item: { type: 'agentMessage', text: JSON.stringify(message.result) } } })
    setTimeout(() => send({ method: 'turn/completed', params: { threadId: 'thread-fixture', turn: { id: 'turn-fixture', status: 'completed' } } }), 10)
  }
  if (message.id === 101 && method === 'plan_question') {
    if (message.result?.answers?.q1?.answers?.[0] !== 'GLB') return process.exit(3)
    setTimeout(() => {
      send({ method: 'serverRequest/resolved', params: { threadId: 'thread-fixture', requestId: 101 } })
      finish(questionTurn)
    }, 10)
  }
  if (message.id === 102 && method.startsWith('next_turn_')) {
    if (!message.result?.success) return process.exit(3)
    setTimeout(() => finish(questionTurn), 40)
  }
})
