const REQUIRED_DESKTOP_BRIDGE_METHODS = [
  'loadBootstrap',
  'saveAppState',
  'savePreferences',
]

let fallbackIdSequence = 0

export function resolveDesktopBridge(bridge = globalThis.window?.desktopBridge) {
  if (!bridge || typeof bridge !== 'object') {
    throw new TypeError('desktopBridge is unavailable')
  }

  for (const method of REQUIRED_DESKTOP_BRIDGE_METHODS) {
    if (typeof bridge[method] !== 'function') {
      throw new TypeError(`desktopBridge.${method} must be a function`)
    }
  }
  return bridge
}

export function createDesktopStateId(cryptoCapability = globalThis.crypto) {
  if (typeof cryptoCapability?.randomUUID === 'function') {
    return cryptoCapability.randomUUID()
  }

  fallbackIdSequence += 1
  return `desktop-${Date.now().toString(36)}-${fallbackIdSequence.toString(36)}`
}

export const desktopIdFactory = Object.freeze({
  createId: createDesktopStateId,
})
