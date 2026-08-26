'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// Sandboxed preloads only have Electron's limited require polyfill, so this file
// intentionally stays self-contained instead of importing local CommonJS files.
const desktopBridge = Object.freeze({
  exportBackup: (value) => ipcRenderer.invoke('desktop:export-backup', value),
  importBackup: () => ipcRenderer.invoke('desktop:import-backup'),
  loadBootstrap: () => ipcRenderer.invoke('desktop:load-bootstrap'),
  saveAppState: (value) => ipcRenderer.invoke('desktop:save-app-state', value),
  savePreferences: (value) => ipcRenderer.invoke('desktop:save-preferences', value),
  resizeWindow: (value) => ipcRenderer.invoke('desktop:resize-window', value),
  toggleVisibility: () => ipcRenderer.invoke('desktop:toggle-visibility'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('desktop:set-always-on-top', value),
})

contextBridge.exposeInMainWorld('desktopBridge', desktopBridge)
