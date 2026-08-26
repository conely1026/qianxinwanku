import test from 'node:test'
import assert from 'node:assert/strict'
import { createDesktopStateId, resolveDesktopBridge } from './desktopBridge.js'

function createBridge(overrides = {}) {
  return {
    loadBootstrap: async () => ({ appState: null, preferences: null }),
    saveAppState: async () => {},
    savePreferences: async () => {},
    ...overrides,
  }
}

test('desktop bridge requires only the explicit bootstrap and persistence contract', () => {
  const bridge = createBridge()

  assert.equal(resolveDesktopBridge(bridge), bridge)
  assert.throws(() => resolveDesktopBridge(null), /desktopBridge is unavailable/)
  assert.throws(
    () => resolveDesktopBridge(createBridge({ savePreferences: null })),
    /savePreferences/,
  )
})

test('desktop ids use the injected crypto capability without leaking it into core state', () => {
  assert.equal(
    createDesktopStateId({ randomUUID: () => 'desktop-id' }),
    'desktop-id',
  )
  assert.match(createDesktopStateId({}), /^desktop-/)
})
