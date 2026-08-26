const APP_STATE_KEY = 'qianxinwanku.desktop-harness.app-state'
const PREFERENCES_KEY = 'qianxinwanku.desktop-harness.preferences'
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export function isDesktopBrowserHarnessLocation(location) {
  return Boolean(
    location
    && (location.protocol === 'http:' || location.protocol === 'https:')
    && LOOPBACK_HOSTS.has(location.hostname),
  )
}

export function createDesktopBrowserHarnessBridge({ storage, location }) {
  if (!isDesktopBrowserHarnessLocation(location)) {
    throw new TypeError('Desktop browser harness requires a loopback URL')
  }
  if (!storage?.getItem || !storage?.setItem) {
    throw new TypeError('Desktop browser harness requires storage')
  }

  return Object.freeze({
    async loadBootstrap() {
      return {
        appState: readJson(storage, APP_STATE_KEY),
        preferences: readJson(storage, PREFERENCES_KEY),
      }
    },
    async saveAppState(value) {
      storage.setItem(APP_STATE_KEY, JSON.stringify(value))
      return true
    },
    async savePreferences(value) {
      storage.setItem(PREFERENCES_KEY, JSON.stringify(value))
      return true
    },
    async resizeWindow(value) {
      return value
    },
    async setAlwaysOnTop(value) {
      return value
    },
    async toggleVisibility() {
      return true
    },
    async exportBackup() {
      return { canceled: true }
    },
    async importBackup() {
      return { canceled: true }
    },
  })
}

function readJson(storage, key) {
  const serialized = storage.getItem(key)
  if (!serialized) return null
  try {
    return JSON.parse(serialized)
  } catch {
    return null
  }
}
