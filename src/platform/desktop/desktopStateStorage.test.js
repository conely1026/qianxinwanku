import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APP_STATE_SCHEMA_VERSION,
  UnsupportedAppStateVersionError,
} from '../../core/state/appState.js'
import { createDesktopStateStorage } from './desktopStateStorage.js'

function createBridge(saveAppState = async () => {}) {
  return {
    loadBootstrap: async () => ({ appState: null, preferences: null }),
    saveAppState,
    savePreferences: async () => {},
  }
}

test('desktop app-state storage reads only its normalized preloaded snapshot', () => {
  let saveCount = 0
  const bridge = createBridge(async () => {
    saveCount += 1
  })
  const storage = createDesktopStateStorage({
    bridge,
    initialState: { version: 1, conversionItems: [] },
  })

  assert.equal(storage.read().schemaVersion, APP_STATE_SCHEMA_VERSION)
  assert.deepEqual(storage.read().conversionItems, [])
  assert.equal(saveCount, 0)
  assert.equal(typeof storage.subscribe(() => {}), 'function')
})

test('desktop app-state storage rejects future preload without writing it back', () => {
  let saveCount = 0
  const bridge = createBridge(async () => {
    saveCount += 1
  })

  assert.throws(
    () => createDesktopStateStorage({
      bridge,
      initialState: { schemaVersion: APP_STATE_SCHEMA_VERSION + 1 },
    }),
    UnsupportedAppStateVersionError,
  )
  assert.equal(saveCount, 0)
})

test('desktop app-state writes delegate asynchronously and expose error reporting', async () => {
  const saved = []
  const writeError = () => {}
  const storage = createDesktopStateStorage({
    bridge: createBridge(async (state) => {
      await Promise.resolve()
      saved.push(state)
      return 'saved'
    }),
    onWriteError: writeError,
  })
  const nextState = { schemaVersion: APP_STATE_SCHEMA_VERSION, marker: 'local update' }

  assert.equal(await storage.write(nextState), 'saved')
  assert.deepEqual(saved, [nextState])
  assert.equal(storage.onWriteError, writeError)
})
