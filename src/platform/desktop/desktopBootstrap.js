import { normalizeState } from '../../core/state/appState.js'
import { createDesktopStateId, resolveDesktopBridge } from './desktopBridge.js'
import {
  normalizeDesktopPreferencesState,
  UnsupportedDesktopPreferencesVersionError,
} from './desktopPreferencesStorage.js'

export { UnsupportedDesktopPreferencesVersionError }

export async function loadDesktopBootstrap(bridge, {
  createId = createDesktopStateId,
  resolveSkinId,
} = {}) {
  const desktopBridge = resolveDesktopBridge(bridge)
  const bootstrap = await desktopBridge.loadBootstrap()
  if (!bootstrap || typeof bootstrap !== 'object' || Array.isArray(bootstrap)) {
    throw new TypeError('desktopBridge.loadBootstrap must resolve to an object')
  }

  return {
    appState: normalizeState(bootstrap.appState, { createId }),
    preferences: normalizeDesktopPreferencesState(
      bootstrap.preferences,
      { resolveSkinId },
    ),
  }
}
