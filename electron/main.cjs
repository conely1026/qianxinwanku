'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  session,
  Tray,
} = require('electron')
const {
  DEFAULT_WINDOW_SIZE,
  IPC_CHANNELS,
  assertPreferencesPayload,
  assertBoolean,
  assertWindowBounds,
  assertWindowSize,
  validateDesktopDevUrl,
} = require('./bridgeContract.cjs')
const {
  createDesktopBackupFilename,
  readDesktopBackup,
  writeDesktopBackup,
} = require('./backupFiles.cjs')
const { createDesktopDataStore } = require('./fileStore.cjs')

const LOCAL_RENDERER_PATH = path.join(app.getAppPath(), 'dist-desktop', 'desktop.html')
const PRELOAD_PATH = path.join(__dirname, 'preload.cjs')
const ICON_PATH = path.join(app.getAppPath(), 'build', 'icon.ico')
const TRAY_ICON_PATH = path.join(app.getAppPath(), 'build', 'tray-icon.png')
const DEFAULT_DESKTOP_PREFERENCES = Object.freeze({
  schemaVersion: 1,
  selectedSkinId: 'capsule',
  scale: 1,
  alwaysOnTop: true,
  locked: false,
  closeBehavior: 'hide',
  windowBounds: null,
  lastSeenReleaseId: null,
})

let dataStore
let mainWindow
let tray
let isQuitting = false
let currentPreferences = null
let preferencesWereAbsent = false
let futureBootstrapProtected = false
let windowMovePersistenceEnabled = false
let pendingMoveSave
let lastWindowPosition

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.show()
  mainWindow.focus()
}

function createTrayIcon() {
  if (!fs.existsSync(TRAY_ICON_PATH)) return nativeImage.createEmpty()
  const image = nativeImage.createFromPath(TRAY_ICON_PATH)
  return image.isEmpty() ? nativeImage.createEmpty() : image
}

function buildTrayMenu() {
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示挂件', click: showWindow },
    {
      label: '解除位置锁定',
      enabled: !futureBootstrapProtected && currentPreferences?.locked === true,
      click: () => {
        void unlockWindowPosition().catch((error) => {
          console.error('Failed to unlock the desktop widget position.', error)
        })
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ]))
}

function showWindowContextMenu(window) {
  const template = [
    {
      label: currentPreferences?.alwaysOnTop === false ? '开启窗口置顶' : '关闭窗口置顶',
      enabled: !futureBootstrapProtected,
      click: () => {
        void setWindowAlwaysOnTopPreference(currentPreferences?.alwaysOnTop === false).catch((error) => {
          console.error('Failed to update always-on-top from the window menu.', error)
        })
      },
    },
    {
      label: '解除位置锁定',
      enabled: !futureBootstrapProtected && currentPreferences?.locked === true,
      click: () => {
        void unlockWindowPosition().catch((error) => {
          console.error('Failed to unlock the desktop widget position.', error)
        })
      },
    },
    { type: 'separator' },
    { label: '隐藏到托盘', click: () => window.hide() },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ]
  Menu.buildFromTemplate(template).popup({ window })
}

function createTray() {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('千薪万苦')
  buildTrayMenu()
  tray.on('click', showWindow)
}

function applyPreferences(preferences) {
  currentPreferences = preferences
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(preferences.alwaysOnTop)
  }
  if (tray) buildTrayMenu()
}

async function setWindowAlwaysOnTopPreference(alwaysOnTop) {
  if (futureBootstrapProtected) return false
  const basePreferences = currentPreferences
    || (preferencesWereAbsent ? DEFAULT_DESKTOP_PREFERENCES : null)
  if (!basePreferences) return false
  const nextPreferences = { ...basePreferences, alwaysOnTop }
  await dataStore.savePreferences(nextPreferences)
  preferencesWereAbsent = false
  applyPreferences(nextPreferences)
  return true
}

async function unlockWindowPosition() {
  if (futureBootstrapProtected || !currentPreferences?.locked) return false
  const nextPreferences = {
    ...currentPreferences,
    locked: false,
    windowBounds: mainWindow && !mainWindow.isDestroyed()
      ? mainWindow.getBounds()
      : currentPreferences.windowBounds,
  }
  await dataStore.savePreferences(nextPreferences)
  applyPreferences(nextPreferences)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.reload()
    showWindow()
  }
  return true
}

function isFutureSchemaRoot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return [value.schemaVersion, value.version].some((version) => Number.isInteger(version) && version > 1)
}

function getCurrentPreferences(value) {
  try {
    return assertPreferencesPayload(value)
  } catch {
    return null
  }
}

async function persistWindowBounds(window) {
  if (futureBootstrapProtected || !window || window.isDestroyed()) return false
  const basePreferences = currentPreferences
    || (preferencesWereAbsent ? DEFAULT_DESKTOP_PREFERENCES : null)
  if (!basePreferences) return false

  const nextPreferences = {
    ...basePreferences,
    windowBounds: assertWindowBounds(window.getBounds()),
  }
  await dataStore.savePreferences(nextPreferences)
  preferencesWereAbsent = false
  applyPreferences(nextPreferences)
  return true
}

function scheduleWindowBoundsPersistence(window) {
  if (!windowMovePersistenceEnabled || futureBootstrapProtected) return
  const { x, y } = window.getBounds()
  if (lastWindowPosition?.x === x && lastWindowPosition?.y === y) return
  lastWindowPosition = { x, y }
  clearTimeout(pendingMoveSave)
  pendingMoveSave = setTimeout(() => {
    void persistWindowBounds(window).catch((error) => {
      console.error('Failed to persist the desktop widget position.', error)
    })
  }, 200)
}

function restoreWindowBounds(preferences) {
  if (!preferences?.windowBounds) return DEFAULT_WINDOW_SIZE
  try {
    const bounds = assertWindowBounds(preferences.windowBounds)
    const workArea = screen.getDisplayMatching(bounds).workArea
    return {
      ...bounds,
      x: Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - bounds.width)),
      y: Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - bounds.height)),
    }
  } catch {
    return DEFAULT_WINDOW_SIZE
  }
}

function isAllowedNavigation(targetUrl, developmentUrl) {
  try {
    const target = new URL(targetUrl)
    if (developmentUrl) return target.origin === new URL(developmentUrl).origin

    const localRendererUrl = new URL(pathToFileURL(LOCAL_RENDERER_PATH).href)
    return target.protocol === 'file:' && target.pathname === localRendererUrl.pathname
  } catch {
    return false
  }
}

async function loadRenderer(window, developmentUrl) {
  if (developmentUrl) {
    await window.loadURL(developmentUrl)
    return
  }
  await window.loadFile(LOCAL_RENDERER_PATH)
}

function createMainWindow(preferences, developmentUrl) {
  const bounds = restoreWindowBounds(preferences)
  const icon = fs.existsSync(ICON_PATH) ? ICON_PATH : undefined
  const window = new BrowserWindow({
    ...bounds,
    alwaysOnTop: preferences?.alwaysOnTop ?? true,
    backgroundColor: '#00000000',
    frame: false,
    fullscreenable: false,
    hasShadow: false,
    icon,
    maximizable: false,
    minHeight: 70,
    minWidth: 300,
    minimizable: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: PRELOAD_PATH,
      sandbox: true,
      webSecurity: true,
    },
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isAllowedNavigation(targetUrl, developmentUrl)) event.preventDefault()
  })
  window.webContents.on('context-menu', () => showWindowContextMenu(window))
  window.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    window.hide()
  })
  window.on('move', () => scheduleWindowBoundsPersistence(window))
  window.once('ready-to-show', () => {
    showWindow()
    const { x, y } = window.getBounds()
    lastWindowPosition = { x, y }
    setImmediate(() => {
      windowMovePersistenceEnabled = true
    })
  })

  void loadRenderer(window, developmentUrl).catch((error) => {
    console.error('Failed to load the desktop renderer.', error)
    isQuitting = true
    app.quit()
  })
  return window
}

function assertTrustedRenderer(event) {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    throw new Error('IPC call rejected: untrusted renderer')
  }
}

function resizeMainWindow(window, size) {
  const wasResizable = window.isResizable()
  if (!wasResizable) window.setResizable(true)
  try {
    window.setSize(size.width, size.height)
  } finally {
    if (!wasResizable) window.setResizable(false)
  }
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.EXPORT_BACKUP, async (event, value) => {
    assertTrustedRenderer(event)
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出千薪万苦备份',
      defaultPath: path.join(app.getPath('documents'), createDesktopBackupFilename()),
      filters: [{ name: 'JSON 备份', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    const filename = await writeDesktopBackup(result.filePath, value)
    return { canceled: false, filename }
  })
  ipcMain.handle(IPC_CHANNELS.IMPORT_BACKUP, async (event) => {
    assertTrustedRenderer(event)
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入千薪万苦备份',
      properties: ['openFile'],
      filters: [{ name: 'JSON 备份', extensions: ['json'] }],
    })
    if (result.canceled || result.filePaths.length !== 1) return { canceled: true }
    const data = await readDesktopBackup(result.filePaths[0])
    return { canceled: false, data }
  })
  ipcMain.handle(IPC_CHANNELS.LOAD_BOOTSTRAP, async (event) => {
    assertTrustedRenderer(event)
    return dataStore.loadBootstrap()
  })
  ipcMain.handle(IPC_CHANNELS.SAVE_APP_STATE, async (event, value) => {
    assertTrustedRenderer(event)
    if (futureBootstrapProtected) throw new Error('future desktop data is read-only')
    return dataStore.saveAppState(value)
  })
  ipcMain.handle(IPC_CHANNELS.SAVE_PREFERENCES, async (event, value) => {
    assertTrustedRenderer(event)
    if (futureBootstrapProtected) throw new Error('future desktop data is read-only')
    const result = await dataStore.savePreferences(value)
    preferencesWereAbsent = false
    applyPreferences(value)
    return result
  })
  ipcMain.handle(IPC_CHANNELS.RESIZE_WINDOW, (event, value) => {
    assertTrustedRenderer(event)
    const size = assertWindowSize(value)
    resizeMainWindow(mainWindow, size)
    return size
  })
  ipcMain.handle(IPC_CHANNELS.TOGGLE_VISIBILITY, (event) => {
    assertTrustedRenderer(event)
    if (mainWindow.isVisible()) mainWindow.hide()
    else showWindow()
    return mainWindow.isVisible()
  })
  ipcMain.handle(IPC_CHANNELS.SET_ALWAYS_ON_TOP, (event, value) => {
    assertTrustedRenderer(event)
    const alwaysOnTop = assertBoolean(value, 'alwaysOnTop')
    mainWindow.setAlwaysOnTop(alwaysOnTop)
    return alwaysOnTop
  })
}

async function startApplication() {
  const developmentUrl = validateDesktopDevUrl(process.env.QIANXINWANKU_DESKTOP_DEV_URL)
  dataStore = createDesktopDataStore(app.getPath('userData'))
  const bootstrap = await dataStore.loadBootstrap().catch((error) => {
    console.error('Failed to read desktop bootstrap data.', error)
    return { appState: null, preferences: null }
  })
  futureBootstrapProtected = isFutureSchemaRoot(bootstrap.appState)
    || isFutureSchemaRoot(bootstrap.preferences)
  preferencesWereAbsent = bootstrap.preferences === null
  currentPreferences = getCurrentPreferences(bootstrap.preferences)

  session.defaultSession.setPermissionCheckHandler(() => false)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  registerIpcHandlers()
  mainWindow = createMainWindow(currentPreferences, developmentUrl)
  createTray()
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', showWindow)
  app.on('activate', showWindow)
  app.on('before-quit', () => {
    isQuitting = true
  })
  app.on('window-all-closed', () => {})
  app.whenReady().then(startApplication).catch((error) => {
    console.error('Failed to start the desktop application.', error)
    isQuitting = true
    app.quit()
  })
}
