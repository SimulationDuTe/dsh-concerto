import readline from 'node:readline'
const method = process.argv[2]
const send = (value) => process.stdout.write(JSON.stringify(value) + '\n')
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line)
  if (message.method === 'initialize') send({ id: message.id, result: { userAgent: 'fixture' } })
  if (message.method === 'thread/start') send({ id: message.id, result: { thread: { id: 'thread-fixture' } } })
  if (message.method === 'turn/start') {
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
})
