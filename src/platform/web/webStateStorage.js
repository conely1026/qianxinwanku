import {
  classifyAppStateVersion,
  DEFAULT_STATE,
  normalizeState,
} from '../../core/state/appState.js'

export const STORAGE_KEY = 'qianxinwanku:state:v1'

let fallbackIdSequence = 0

export function createWebStateId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  fallbackIdSequence += 1
  return `local-${Date.now().toString(36)}-${fallbackIdSequence.toString(36)}`
}

export const webIdFactory = Object.freeze({ createId: createWebStateId })

export function createWebStateStorage({
  key = STORAGE_KEY,
  storage,
  eventTarget,
  createId = createWebStateId,
} = {}) {
  function getStorage() {
    return storage ?? globalThis.window?.localStorage
  }

  function getEventTarget() {
    return eventTarget ?? globalThis.window
  }

  function normalize(value) {
    return normalizeState(value, { createId })
  }

  function read() {
    let stored
    try {
      stored = getStorage()?.getItem(key)
    } catch {
      return DEFAULT_STATE
    }

    if (!stored) return DEFAULT_STATE

    let parsed
    try {
      parsed = JSON.parse(stored)
    } catch {
      return DEFAULT_STATE
    }

    return normalize(parsed)
  }

  function write(state) {
    try {
      const targetStorage = getStorage()
      if (!targetStorage) return false
      const existingValue = targetStorage.getItem(key)
      if (existingValue) {
        try {
          if (classifyAppStateVersion(JSON.parse(existingValue)) === 'future') return false
        } catch {
          // A user action may replace malformed local data, but never a newer schema.
        }
      }
      targetStorage.setItem(key, JSON.stringify(state))
      return true
    } catch {
      return false
    }
  }

  function subscribe(onStateChange) {
    const target = getEventTarget()
    if (!target?.addEventListener) return () => {}

    function handleStorage(event) {
      if (event.key !== key || !event.newValue) return
      try {
        onStateChange(normalize(JSON.parse(event.newValue)))
      } catch {
        // Ignore malformed updates from another tab.
      }
    }

    target.addEventListener('storage', handleStorage)
    return () => target.removeEventListener('storage', handleStorage)
  }

  return { key, normalize, read, write, subscribe }
}

export const webStateStorage = createWebStateStorage()
