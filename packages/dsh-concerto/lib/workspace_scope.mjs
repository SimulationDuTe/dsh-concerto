import { relative, isAbsolute, resolve, sep } from 'node:path'

export const workspaceKey = (path) => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path)
export function scopesOverlap(a, b) {
  if (!a || !b) return false
  const contains = (root, child) => {
    const part = relative(workspaceKey(root), workspaceKey(child))
    return part === '' || (part !== '..' && !part.startsWith('..' + sep) && !isAbsolute(part))
  }
  return contains(a, b) || contains(b, a)
}
