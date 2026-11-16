/** JSON 应答；一律 no-store，读模型不要被浏览器缓存。 */
export function sendJson(res, status, body) {
  // res.writeHead 用于一次性写入 HTTP 状态码和响应头
  res.writeHead(status, {
    // 告诉浏览器或客户端：我返回的是 UTF-8 编码的 JSON 格式数据
    'content-type': 'application/json; charset=utf-8',
    // 核心安全/一致性配置：禁止任何形式的缓存（浏览器、代理服务器都不要存）
    // 因为这是“读模型”，如果缓存了旧数据，用户看到的团队列表就不是实时的
    'cache-control': 'no-store',
  })
  // 将 JS 对象序列化为 JSON 字符串，并结束这次 HTTP 响应
  res.end(JSON.stringify(body))
}

/** 请求体上限 1 MiB，与已装插件一致。 */
export async function readJsonBody(req, maxBytes = 1024 * 1024) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new Error('JSON content-type required')
  const chunks = []
  let received = 0
  // for await...of 用于异步迭代。HTTP 请求体（req）是一个数据流（Stream），
  // 数据是一块一块（chunk）传过来的，而不是一次性全到。
  for await (const chunk of req) {
    // 兼容处理：有时候 chunk 已经是 Buffer，有时候可能是字符串（比如设置了 encoding）
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    
    // 累加已接收的字节数
    received += buffer.length
    // 安全防护：如果超过了限制大小（默认 1MB），直接抛出异常，防止恶意大包撑爆服务器内存
    if (received > maxBytes) throw new Error('request body too large')
    
    // 把合法的分片数据存起来
    chunks.push(buffer)
  }
  // 1. 把所有的 Buffer 分片拼接成一个完整的 Buffer
  // 2. 转换成 UTF-8 字符串
  // 3. 用 JSON.parse 解析成 JS 对象
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('JSON object required')
  return body
}

// 判断传入的 host 字符串是否属于“本地回环地址”（即请求是否来自本机）
function isLoopbackHost(host) {
  // 如果 host 是 IPv6 格式（如 [::1]:8080），取出中括号内的部分
  // 否则（如 127.0.0.1:8080），按冒号切分，取前面的 IP 或域名（去掉端口号）
  const name = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]
  
  // 校验是否为标准的本机地址：IPv4 的 127.0.0.1、域名 localhost、IPv6 的 [::1] 或 ::1
  return name === '127.0.0.1' || name === 'localhost' || name === '[::1]' || name === '::1'
}

/** 桌面端转发：无 origin 时，用「同站 + 回环」保守放行。 */
// 这个函数用于 DSH 桌面端（Electron）发出的请求。因为有些客户端请求可能不带 Origin 头
function desktopForwarded(req) {
  // Sec-Fetch-Site 是浏览器提供的安全头，如果不是 same-origin（同源），直接拒绝
  const site = req.headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin') return false
  
  // 防伪造：如果请求经过了代理服务器（比如 Nginx），可能会有这些转发头。
  // 为了防止黑客伪造本地请求，只要出现了任何代理转发头，一律视为不安全，直接拒绝
  if (req.headers.forwarded !== undefined
    || req.headers['x-forwarded-for'] !== undefined
    || req.headers['x-real-ip'] !== undefined) return false
  
  // 获取请求头里的 Host
  const host = req.headers.host
  // Host 必须存在，且必须是本地回环地址（比如 localhost）
  if (host === undefined || !isLoopbackHost(host)) return false
  
  // 获取底层 TCP 连接的真实远端 IP
  const address = req.socket.remoteAddress ?? ''
  // 真实连接的 IP 也必须是本机 IPv4、IPv6 或 IPv4 映射到 IPv6 的地址
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

/** 只接受同源请求（设计 §7.7：归属由 Host 解析，客户端自报不作为授权依据）。 */
// 核心安全校验：防止 CSRF（跨站请求伪造）攻击
export function sameOrigin(req) {
  // Raw webServer routes carry no authenticated DSH Peer. This release is local-owner only.
  const address = req.socket.remoteAddress
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return false
  if (req.headers.forwarded || req.headers['x-forwarded-for'] || req.headers['x-real-ip']) return false
  const origin = req.headers.origin
  const host = req.headers.host
  // 连 Host 都没有，直接拒绝（HTTP/1.1 规范中 Host 是必带的）
  if (host === undefined) return false
  
  // 如果没有 Origin 头（通常只有同源请求或非浏览器客户端才可能没有），走桌面端的保守放行逻辑
  if (origin === undefined) return desktopForwarded(req)
  
  try {
    // 如果有 Origin，尝试解析它（比如 Origin: http://localhost:8080）
    const parsed = new URL(origin)
    // 必须满足两个条件：
    // 1. 协议必须是 http 或 https（防 javascript: 伪协议等）
    // 2. Origin 的域名和端口，必须与请求头的 Host 完全一致（这是判断同源的根本依据）
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
  } catch {
    // 如果 URL 解析失败（比如乱填的 Origin），直接拒绝
    return false
  }
}

/** 固定错误码（§7.7）；不要新增自由文本错误名。 */
// Object.freeze 冻结对象，防止运行过程中被意外修改（比如有人写 ERROR.invalid = 'xxx' 会失效）
// 使用固定的错误码，方便前端统一做判断处理，也避免泄露底层报错细节
export const ERROR = Object.freeze({
  unauthorized: 'unauthorized',       // 未授权（没登录或跨站被拦截）
  notFound: 'not_found',             // 找不到资源（团队不存在）
  conflict: 'conflict',              // 冲突（比如团队名重复了）
  invalid: 'invalid',                // 参数非法（用户乱填数据）
  preconditionFailed: 'precondition_failed', // 前置条件失败（比如乐观锁版本号不匹配）
})

// 错误码与 HTTP 状态码的映射字典
export const STATUS_OF = Object.freeze({
  [ERROR.unauthorized]: 401,
  [ERROR.notFound]: 404,
  [ERROR.conflict]: 409,
  [ERROR.invalid]: 400,
  [ERROR.preconditionFailed]: 412,
})

// 一个快捷函数，用来生成标准格式的错误响应体
// 最终会生成：{ ok: false, code: 'conflict', detail: '...' }
export const fail = (code, detail) => ({ ok: false, code, detail })
