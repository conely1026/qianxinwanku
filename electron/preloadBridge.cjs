'use strict'

const { IPC_CHANNELS } = require('./bridgeContract.cjs')

function createDesktopBridge(invoke) {
  if (typeof invoke !== 'function') throw new TypeError('invoke must be a function')

  return Object.freeze({
    exportBackup: (value) => invoke(IPC_CHANNELS.EXPORT_BACKUP, value),
    importBackup: () => invoke(IPC_CHANNELS.IMPORT_BACKUP),
    loadBootstrap: () => invoke(IPC_CHANNELS.LOAD_BOOTSTRAP),
    saveAppState: (value) => invoke(IPC_CHANNELS.SAVE_APP_STATE, value),
    savePreferences: (value) => invoke(IPC_CHANNELS.SAVE_PREFERENCES, value),
    resizeWindow: (value) => invoke(IPC_CHANNELS.RESIZE_WINDOW, value),
    toggleVisibility: () => invoke(IPC_CHANNELS.TOGGLE_VISIBILITY),
    setAlwaysOnTop: (value) => invoke(IPC_CHANNELS.SET_ALWAYS_ON_TOP, value),
  })
}

module.exports = { createDesktopBridge }
