import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

test('desktop entry awaits protected bootstrap before creating persistence adapters and app root', () => {
  const entrySource = read('../../entries/desktop-main.jsx')
  const bootstrapIndex = entrySource.indexOf('await loadDesktopBootstrap')
  const storageIndex = entrySource.indexOf('createDesktopStateStorage({')
  const rootIndex = entrySource.indexOf('createRoot(rootElement).render(')

  assert.ok(bootstrapIndex >= 0)
  assert.ok(storageIndex > bootstrapIndex)
  assert.ok(rootIndex > storageIndex)
  assert.match(entrySource, /catch \(error\) {\s*renderDesktopProtectionPage\(error\)/)
  assert.match(entrySource, /没有写入任何默认值/)
  assert.doesNotMatch(entrySource, /DEFAULT_STATE|DEFAULT_DESKTOP_PREFERENCES/)
})

test('desktop root reuses shared state actions, view model and skin registry behind injected actions', () => {
  const rootSource = read('./DesktopWidgetRoot.jsx')
  const appSource = read('./DesktopWidgetApp.jsx')

  assert.match(rootSource, /useAppController/)
  assert.match(rootSource, /createDesktopWidgetViewModel/)
  assert.match(rootSource, /desktopWidgetSkinRegistry\.resolve\(preferences\.selectedSkinId\)/)
  assert.match(rootSource, /stateStorage: appStateStorage/)
  assert.match(rootSource, /initialState: bootstrap\.preferences/)
  assert.match(rootSource, /width: 430, height: 620/)
  assert.match(rootSource, /invokeDesktopBridge\(bridge, 'resizeWindow', size, onBridgeError\)/)
  assert.match(rootSource, /'setAlwaysOnTop',\s*Boolean\(preferences\.alwaysOnTop\)/)
  assert.doesNotMatch(appSource, /desktopBridge|localStorage|window\.desktopBridge|getWorkSnapshot|reconcileLeaveSession/)
  assert.match(appSource, /<CompactView model={model} actions={skinActions}/)
  assert.match(appSource, /<TodayView/)
  assert.match(appSource, /<ConvertView/)
  assert.match(appSource, /<CalendarView/)
  assert.match(appSource, /<ProfileView/)
  assert.match(appSource, /createDesktopBackupAdapter/)
  assert.match(appSource, /<ReleaseNotesModal/)
})

test('desktop HTML and styles stay on the desktop-only entry', () => {
  const entrySource = read('../../entries/desktop-main.jsx')
  const webEntrySource = read('../../main.jsx')
  const desktopHtml = read('../../../desktop.html')
  const desktopViteConfig = read('../../../vite.desktop.config.js')
  const desktopRendererCss = read('./desktopRenderer.css')
  const compactSkinCss = read('../../features/desktop-widget/skins/desktopWidgetSkins.css')

  assert.match(entrySource, /desktopWidgetSkins\.css/)
  assert.match(entrySource, /desktopRenderer\.css/)
  assert.equal(webEntrySource.includes('desktopWidgetSkins.css'), false)
  assert.equal(webEntrySource.includes('desktopRenderer.css'), false)
  assert.match(desktopHtml, /src\/entries\/desktop-main\.jsx/)
  assert.doesNotMatch(desktopHtml, /manifest\.webmanifest|sw\.js/)
  assert.match(desktopViteConfig, /publicDir:\s*false/)
  assert.match(desktopRendererCss, /\bapp-region:\s*drag;/)
  assert.match(desktopRendererCss, /\bapp-region:\s*no-drag;/)
  assert.match(compactSkinCss, /\bapp-region:\s*drag;/)
  assert.match(compactSkinCss, /\bapp-region:\s*no-drag;/)
})
