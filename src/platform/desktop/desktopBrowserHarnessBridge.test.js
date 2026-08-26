import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createDesktopBrowserHarnessBridge,
  isDesktopBrowserHarnessLocation,
} from './desktopBrowserHarnessBridge.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('desktop browser harness is restricted to loopback development locations', () => {
  assert.equal(isDesktopBrowserHarnessLocation(new URL('http://127.0.0.1:5173/desktop.html')), true)
  assert.equal(isDesktopBrowserHarnessLocation(new URL('http://localhost:5173/desktop.html')), true)
  assert.equal(isDesktopBrowserHarnessLocation(new URL('https://example.com/desktop.html')), false)
})

test('desktop browser harness preserves app state and preferences independently', async () => {
  const storage = createStorage()
  const bridge = createDesktopBrowserHarnessBridge({
    storage,
    location: new URL('http://127.0.0.1:5173/desktop.html'),
  })

  assert.deepEqual(await bridge.loadBootstrap(), { appState: null, preferences: null })
  await bridge.saveAppState({ schemaVersion: 1, lastView: 'today' })
  await bridge.savePreferences({ schemaVersion: 1, selectedSkinId: 'office-cat' })
  assert.deepEqual(await bridge.loadBootstrap(), {
    appState: { schemaVersion: 1, lastView: 'today' },
    preferences: { schemaVersion: 1, selectedSkinId: 'office-cat' },
  })
})

test('desktop browser harness refuses non-loopback pages', () => {
  assert.throws(() => createDesktopBrowserHarnessBridge({
    storage: createStorage(),
    location: new URL('https://example.com/desktop.html'),
  }), /loopback/)
})
