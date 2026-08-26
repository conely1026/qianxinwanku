import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_DESKTOP_PREFERENCES,
  DESKTOP_PREFERENCES_SCHEMA_VERSION,
} from './desktopPreferences.js'
import {
  createDesktopPreferencesStorage,
  UnsupportedDesktopPreferencesVersionError,
} from './desktopPreferencesStorage.js'

function createBridge(savePreferences = async () => {}) {
  return {
    loadBootstrap: async () => ({ appState: null, preferences: null }),
    saveAppState: async () => {},
    savePreferences,
  }
}

test('desktop preference storage normalizes its preload without saving defaults', () => {
  let saveCount = 0
  const storage = createDesktopPreferencesStorage({
    bridge: createBridge(async () => {
      saveCount += 1
    }),
    initialState: null,
  })

  assert.equal(storage.read(), DEFAULT_DESKTOP_PREFERENCES)
  assert.equal(saveCount, 0)
  assert.equal(typeof storage.subscribe(() => {}), 'function')
})

test('desktop preference storage rejects future preload without writing it back', () => {
  let saveCount = 0
  assert.throws(
    () => createDesktopPreferencesStorage({
      bridge: createBridge(async () => {
        saveCount += 1
      }),
      initialState: { schemaVersion: DESKTOP_PREFERENCES_SCHEMA_VERSION + 1 },
    }),
    UnsupportedDesktopPreferencesVersionError,
  )
  assert.equal(saveCount, 0)
})

test('desktop preference writes delegate asynchronously and use skin resolution', async () => {
  const saved = []
  const storage = createDesktopPreferencesStorage({
    bridge: createBridge(async (preferences) => {
      saved.push(preferences)
      return true
    }),
    initialState: {
      ...DEFAULT_DESKTOP_PREFERENCES,
      selectedSkinId: 'removed-skin',
    },
    resolveSkinId: () => 'capsule',
  })

  assert.equal(storage.read().selectedSkinId, 'capsule')
  assert.equal(await storage.write({ schemaVersion: 1, selectedSkinId: 'office-cat' }), true)
  assert.deepEqual(saved, [{ schemaVersion: 1, selectedSkinId: 'office-cat' }])
})
