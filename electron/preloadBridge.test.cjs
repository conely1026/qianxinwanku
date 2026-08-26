const test = require('node:test')
const assert = require('node:assert/strict')

const { IPC_CHANNELS } = require('./bridgeContract.cjs')
const { createDesktopBridge } = require('./preloadBridge.cjs')

test('exposes only the desktop method whitelist and never exposes the IPC object', async () => {
  const calls = []
  const bridge = createDesktopBridge((channel, ...args) => {
    calls.push([channel, ...args])
    return Promise.resolve(channel)
  })

  assert.equal(Object.isFrozen(bridge), true)
  assert.deepEqual(Object.keys(bridge).sort(), [
    'exportBackup',
    'importBackup',
    'loadBootstrap',
    'resizeWindow',
    'saveAppState',
    'savePreferences',
    'setAlwaysOnTop',
    'toggleVisibility',
  ])
  assert.equal('ipcRenderer' in bridge, false)

  await bridge.exportBackup({ schemaVersion: 1 })
  await bridge.importBackup()
  await bridge.loadBootstrap()
  await bridge.saveAppState({ schemaVersion: 1 })
  await bridge.savePreferences({ schemaVersion: 1 })
  await bridge.resizeWindow({ width: 430, height: 70 })
  await bridge.toggleVisibility()
  await bridge.setAlwaysOnTop(false)

  assert.deepEqual(calls.map(([channel]) => channel), [
    IPC_CHANNELS.EXPORT_BACKUP,
    IPC_CHANNELS.IMPORT_BACKUP,
    IPC_CHANNELS.LOAD_BOOTSTRAP,
    IPC_CHANNELS.SAVE_APP_STATE,
    IPC_CHANNELS.SAVE_PREFERENCES,
    IPC_CHANNELS.RESIZE_WINDOW,
    IPC_CHANNELS.TOGGLE_VISIBILITY,
    IPC_CHANNELS.SET_ALWAYS_ON_TOP,
  ])
})
