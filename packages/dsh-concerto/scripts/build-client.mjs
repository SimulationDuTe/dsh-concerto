/**
 * Build Concerto DSH client bundle + lazy vendor chunks with esbuild.
 *
 * - Main bundle -> `lib/client.js`:
 *   Externalizes `react` and `react-dom` so DSH `__ModuleLoader__` supplies the host runtime.
 *   Shares geometry helpers directly from `lib/domain/view_layout.mjs` and `lib/domain/view_objects.mjs`.
 *   Remains safe to evaluate under Node `vm.runInNewContext` without `document`.
 * - Lazy vendor chunks -> `lib/vendor/markmap.js`, `lib/vendor/rough.js`:
 *   Loaded on demand in the browser via `/concerto/assets/<name>`.
 */
import { build } from 'esbuild'
import { mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(__dirname, '..')
const outClient = resolve(pkgRoot, 'lib/client.js')
const vendorDir = resolve(pkgRoot, 'lib/vendor')
mkdirSync(vendorDir, { recursive: true })

const hostDepsPlugin = {
  name: 'concerto-dsh-host-deps',
  setup(b) {
    b.onResolve({ filter: /^react(-dom)?$/ }, (args) => ({
      path: args.path,
      namespace: 'dsh-host-dep',
    }))
    b.onLoad({ filter: /.*/, namespace: 'dsh-host-dep' }, (args) => ({
      contents: `module.exports = __CONCERTO_HOST_REQUIRE__(${JSON.stringify(args.path)});`,
      loader: 'js',
    }))
  },
}

const banner = [
  '/*',
  ' * Concerto DSH Client Bundle (generated via esbuild from src/client/**).',
  ' * Host React/ReactDOM stay external via __ModuleLoader__.load deps.',
  ' */',
  'window.__ModuleLoader__.load({',
  "  id: 'dsh-concerto',",
  "  deps: ['react', 'react-dom'],",
  '  factory(require) {',
  '    var __CONCERTO_HOST_REQUIRE__ = require;',
  '    var module = { exports: {} };',
  '    var exports = module.exports;',
].join('\n')

const footer = [
  '    return module.exports && module.exports.default ? module.exports.default : module.exports;',
  '  }',
  '});',
].join('\n')

await build({
  entryPoints: [resolve(pkgRoot, 'src/client/index.js')],
  outfile: outClient,
  bundle: true,
  platform: 'browser',
  target: ['es2022'],
  format: 'cjs',
  plugins: [hostDepsPlugin],
  banner: { js: banner },
  footer: { js: footer },
  minify: false,
  legalComments: 'none',
})

await build({
  entryPoints: [resolve(pkgRoot, 'src/client/vendor/markmap-chunk.js')],
  outfile: resolve(vendorDir, 'markmap.js'),
  bundle: true,
  platform: 'browser',
  target: ['es2022'],
  format: 'esm',
  minify: true,
  legalComments: 'none',
})

await build({
  entryPoints: [resolve(pkgRoot, 'src/client/vendor/rough-chunk.js')],
  outfile: resolve(vendorDir, 'rough.js'),
  bundle: true,
  platform: 'browser',
  target: ['es2022'],
  format: 'esm',
  minify: true,
  legalComments: 'none',
})

const report = [
  'lib/client.js',
  'lib/vendor/markmap.js',
  'lib/vendor/rough.js',
].map((rel) => {
  const bytes = statSync(resolve(pkgRoot, rel)).size
  return `${rel}: ${bytes} B (${(bytes / 1024).toFixed(1)} KiB)`
})

console.log('[concerto:build-client]\n  ' + report.join('\n  '))
