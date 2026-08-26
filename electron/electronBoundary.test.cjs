const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const mainSource = fs.readFileSync(path.join(__dirname, 'main.cjs'), 'utf8')
const preloadSource = fs.readFileSync(path.join(__dirname, 'preload.cjs'), 'utf8')

test('main window keeps the frozen Electron security options and local production entry', () => {
  assert.match(mainSource, /contextIsolation:\s*true/)
  assert.match(mainSource, /nodeIntegration:\s*false/)
  assert.match(mainSource, /sandbox:\s*true/)
  assert.match(mainSource, /transparent:\s*true/)
  assert.match(mainSource, /frame:\s*false/)
  assert.match(mainSource, /dist-desktop['"],\s*['"]desktop\.html/)
  assert.match(mainSource, /QIANXINWANKU_DESKTOP_DEV_URL/)
  assert.match(mainSource, /setWindowOpenHandler\(\(\) => \(\{ action: ['"]deny['"] \}\)\)/)
})

test('sandboxed preload is self-contained and exposes methods instead of ipcRenderer', () => {
  assert.doesNotMatch(preloadSource, /require\(['"]\.\//)
  assert.match(preloadSource, /exposeInMainWorld\(['"]desktopBridge['"],\s*desktopBridge\)/)
  assert.doesNotMatch(preloadSource, /exposeInMainWorld\(['"]ipcRenderer['"]/)
  assert.doesNotMatch(preloadSource, /send\(|sendSync\(|on\(/)
})

test('tray recovery and preference saves both update the main-process preference state', () => {
  assert.match(mainSource, /label:\s*['"]解除位置锁定['"]/)
  assert.match(
    mainSource,
    /enabled:\s*!futureBootstrapProtected && currentPreferences\?\.locked === true/,
  )
  assert.match(mainSource, /applyPreferences\(value\)/)
  assert.match(mainSource, /mainWindow\.setAlwaysOnTop\(preferences\.alwaysOnTop\)/)
  assert.match(mainSource, /window\.on\(['"]move['"],\s*\(\) => scheduleWindowBoundsPersistence\(window\)\)/)
  assert.match(mainSource, /futureBootstrapProtected/)
  assert.match(mainSource, /tray\.setToolTip\(['"]千薪万苦['"]\)/)
})

test('programmatic compact resize works around the non-resizable Windows window limitation', () => {
  assert.match(mainSource, /const wasResizable = window\.isResizable\(\)/)
  assert.match(mainSource, /if \(!wasResizable\) window\.setResizable\(true\)/)
  assert.match(mainSource, /window\.setSize\(size\.width, size\.height\)/)
  assert.match(mainSource, /if \(!wasResizable\) window\.setResizable\(false\)/)
  assert.match(mainSource, /resizeMainWindow\(mainWindow, size\)/)
})
