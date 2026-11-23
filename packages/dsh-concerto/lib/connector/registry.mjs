/**
 * Connector 注册表：Runtime 只按 id 取适配器，不知道具体后端。
 * 设计：§2.1「Connector 注册」是业务包职责之一。
 */
import { assertAdapter } from './contract.mjs'

export function createConnectorRegistry() {
  /** @type {Map<string, object>} */
  const adapters = new Map()

  return {
    /** 注册适配器；返回注销函数。同 id 重复注册直接报错（避免静默覆盖）。 */
    register(adapter) {
      assertAdapter(adapter)
      if (adapters.has(adapter.id)) throw new Error(`connector ${adapter.id} already registered`)
      adapters.set(adapter.id, adapter)
      return () => adapters.delete(adapter.id)
    },

    /** 热更新或注册自定义适配器。 */
    upsert(adapter) {
      assertAdapter(adapter)
      adapters.set(adapter.id, adapter)
      return () => adapters.delete(adapter.id)
    },

    unregister(id) {
      return adapters.delete(id)
    },

    get(id) {
      return adapters.get(id) ?? null
    },

    list() {
      return [...adapters.values()].map((adapter) => ({
        id: adapter.id,
        displayName: adapter.displayName ?? adapter.id,
        protocol: adapter.protocol ?? 'native',
        description: adapter.description ?? '',
        custom: Boolean(adapter.custom),
        ...(adapter.mode ? { mode: adapter.mode } : {}),
        ...(adapter.command ? { command: adapter.command } : {}),
        capabilities: adapter.capabilities,
      }))
    },
  }
}
