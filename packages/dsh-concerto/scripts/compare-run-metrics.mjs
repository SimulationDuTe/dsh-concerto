import { readFileSync } from 'node:fs'

const columns = ['runId', 'endToEndMs', 'accepted', 'reworks', 'manualOps']
const unknown = 'unknown'

function parseCsv(source, path) {
  const field = /(?:"((?:[^"]|"")*)"|([^",\r\n]*))(,|\r\n|\r|\n|$)/y
  const rows = []
  let cells = []
  while (field.lastIndex < source.length) {
    const match = field.exec(source)
    if (!match) throw new Error(`${path}: malformed CSV record ${rows.length + 1}`)
    const [, quoted, unquoted, separator] = match
    cells.push(quoted === undefined ? unquoted : quoted.replaceAll('""', '"'))
    if (separator !== ',') {
      rows.push(cells)
      cells = []
    }
  }
  if (cells.length) rows.push([...cells, ''])
  return rows
}

function readRuns(path) {
  const [header, ...rows] = parseCsv(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''), path)
  if (header?.length !== columns.length || !columns.every((name, index) => name === header[index])) {
    throw new Error(`${path}: expected CSV header ${columns.join(',')}`)
  }

  const runIds = new Set()
  const runs = []
  for (const [index, cells] of rows.entries()) {
    if (cells.length === 1 && cells[0] === '') continue
    const record = `${path}: record ${index + 2}`
    const [runId] = cells
    if (cells.length !== columns.length || !runId.trim()) {
      throw new Error(`${record}: expected five columns and a runId`)
    }
    if (runIds.has(runId)) throw new Error(`${record}: duplicate runId`)
    runIds.add(runId)

    const run = {}
    for (const [fieldIndex, name] of columns.entries()) {
      if (fieldIndex === 0) continue
      const value = cells[fieldIndex].trim()
      if (value === '' || value === unknown) {
        run[name] = null
      } else if (name === 'accepted') {
        if (value !== 'true' && value !== 'false') throw new Error(`${record}: accepted must be true, false, or ${unknown}`)
        run.accepted = value === 'true'
      } else {
        const count = Number(value)
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(count)) {
          throw new Error(`${record}: ${name} must be a non-negative integer or ${unknown}`)
        }
        run[name] = count
      }
    }
    runs.push(run)
  }
  return runs
}

function percent(part, total) {
  return total ? (100 * part / total).toFixed(1) + '%' : unknown
}

function acceptedRate(values) {
  const passed = values.filter((value) => value).length
  return `${percent(passed, values.length)} (${passed}/${values.length})`
}

function average(values) {
  return (values.reduce((total, value) => total + value, 0) / values.length).toFixed(1)
}

function formatMetric(runs, name, format) {
  const known = runs.map((run) => run[name]).filter((value) => value !== null)
  const missing = runs.length - known.length
  const result = known.length ? format(known) : unknown
  return `${result} · 已知 ${known.length} · 缺失 ${missing}/${runs.length} (${percent(missing, runs.length)})`
}

const [manualPath, concertoPath, ...extraArgs] = process.argv.slice(2)
try {
  if (!manualPath || !concertoPath || extraArgs.length) {
    throw new Error('Usage: node compare-run-metrics.mjs <manual.csv> <concerto.csv>')
  }
  const manual = readRuns(manualPath)
  const concerto = readRuns(concertoPath)
  const metrics = [
    ['端到端耗时均值（ms）', 'endToEndMs', average],
    ['通过率', 'accepted', acceptedRate],
    ['返工次数均值', 'reworks', average],
    ['人工跨客户端操作次数均值', 'manualOps', average],
  ]
  const lines = [
    '| 指标 | 人工组 | Concerto 组 |',
    '| --- | --- | --- |',
    `| 样本数 | ${manual.length} | ${concerto.length} |`,
    ...metrics.map(([label, name, format]) => (
      `| ${label} | ${formatMetric(manual, name, format)} | ${formatMetric(concerto, name, format)} |`
    )),
  ]
  process.stdout.write(lines.join('\n') + '\n')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
