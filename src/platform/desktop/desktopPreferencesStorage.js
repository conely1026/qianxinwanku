import {
  DEFAULT_DESKTOP_PREFERENCES,
  DESKTOP_PREFERENCES_SCHEMA_VERSION,
  normalizeDesktopPreferences,
} from './desktopPreferences.js'
import { resolveDesktopBridge } from './desktopBridge.js'

export class UnsupportedDesktopPreferencesVersionError extends TypeError {
  constructor(version) {
    super(`Desktop preferences schema version ${version} is newer than this app supports.`)
    this.name = 'UnsupportedDesktopPreferencesVersionError'
    this.code = 'DESKTOP_PREFERENCES_VERSION_FUTURE'
    this.version = version
  }
}

export function normalizeDesktopPreferencesState(value, options = {}) {
  if (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Number.isInteger(value.schemaVersion)
    && value.schemaVersion > DESKTOP_PREFERENCES_SCHEMA_VERSION
  ) {
    throw new UnsupportedDesktopPreferencesVersionError(value.schemaVersion)
  }
  return normalizeDesktopPreferences(value, options)
}

export function createDesktopPreferencesStorage({
  bridge,
  initialState = DEFAULT_DESKTOP_PREFERENCES,
  resolveSkinId,
  onWriteError,
} = {}) {
  const desktopBridge = resolveDesktopBridge(bridge)
  const normalize = (value) => normalizeDesktopPreferencesState(value, { resolveSkinId })
  const preloadedSnapshot = normalize(initialState)

  return {
    normalize,
    read() {
      return preloadedSnapshot
    },
    write(preferences) {
      return desktopBridge.savePreferences(preferences)
    },
    subscribe() {
      return () => {}
    },
    ...(typeof onWriteError === 'function' ? { onWriteError } : {}),
  }
}
