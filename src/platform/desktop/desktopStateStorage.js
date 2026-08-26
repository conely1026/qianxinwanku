import { DEFAULT_STATE, normalizeState } from '../../core/state/appState.js'
import { createDesktopStateId, resolveDesktopBridge } from './desktopBridge.js'

export function createDesktopStateStorage({
  bridge,
  initialState = DEFAULT_STATE,
  createId = createDesktopStateId,
  onWriteError,
} = {}) {
  const desktopBridge = resolveDesktopBridge(bridge)
  const normalize = (value) => normalizeState(value, { createId })
  const preloadedSnapshot = normalize(initialState)

  return {
    normalize,
    read() {
      return preloadedSnapshot
    },
    write(state) {
      return desktopBridge.saveAppState(state)
    },
    subscribe() {
      return () => {}
    },
    ...(typeof onWriteError === 'function' ? { onWriteError } : {}),
  }
}
