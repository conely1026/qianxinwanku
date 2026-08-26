import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APP_STATE_SCHEMA_VERSION,
  DEFAULT_STATE,
  UnsupportedAppStateVersionError,
} from '../../core/state/appState.js'
import {
  DEFAULT_DESKTOP_PREFERENCES,
  DESKTOP_PREFERENCES_SCHEMA_VERSION,
} from './desktopPreferences.js'
import {
  loadDesktopBootstrap,
  UnsupportedDesktopPreferencesVersionError,
} from './desktopBootstrap.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function createBridge(loadBootstrap) {
  let appStateSaveCount = 0
  let preferencesSaveCount = 0
  return {
    loadBootstrap,
    async saveAppState() {
      appStateSaveCount += 1
    },
    async savePreferences() {
      preferencesSaveCount += 1
    },
    get appStateSaveCount() {
      return appStateSaveCount
    },
    get preferencesSaveCount() {
      return preferencesSaveCount
    },
  }
}

test('bootstrap loading performs no save before or after empty data resolves', async () => {
  const pending = deferred()
  const bridge = createBridge(() => pending.promise)
  const loading = loadDesktopBootstrap(bridge)

  assert.equal(bridge.appStateSaveCount, 0)
  assert.equal(bridge.preferencesSaveCount, 0)

  pending.resolve({ appState: null, preferences: null })
  const bootstrap = await loading

  assert.equal(bootstrap.appState, DEFAULT_STATE)
  assert.equal(bootstrap.preferences, DEFAULT_DESKTOP_PREFERENCES)
  assert.equal(bridge.appStateSaveCount, 0)
  assert.equal(bridge.preferencesSaveCount, 0)
})

test('bootstrap load failures propagate without saving defaults', async () => {
  const bridge = createBridge(async () => {
    throw new Error('load failed')
  })

  await assert.rejects(() => loadDesktopBootstrap(bridge), /load failed/)
  assert.equal(bridge.appStateSaveCount, 0)
  assert.equal(bridge.preferencesSaveCount, 0)
})

test('bootstrap normalizes legacy app state and desktop preferences independently', async () => {
  const bridge = createBridge(async () => ({
    appState: {
      version: 1,
      settings: { monthlySalary: 8800 },
      customItems: [{ name: '旧项目', price: 12 }],
    },
    preferences: {
      schemaVersion: DESKTOP_PREFERENCES_SCHEMA_VERSION,
      selectedSkinId: 'office-cat',
      scale: 1.5,
      alwaysOnTop: false,
      locked: true,
      closeBehavior: 'hide',
      windowBounds: null,
    },
  }))

  const bootstrap = await loadDesktopBootstrap(bridge, {
    createId: () => 'migrated-id',
    resolveSkinId: (id) => id,
  })

  assert.equal(bootstrap.appState.schemaVersion, APP_STATE_SCHEMA_VERSION)
  assert.equal('version' in bootstrap.appState, false)
  assert.equal(bootstrap.appState.conversionItems.at(-1).id, 'migrated-id')
  assert.equal(bootstrap.preferences.selectedSkinId, 'office-cat')
  assert.equal(bridge.appStateSaveCount, 0)
  assert.equal(bridge.preferencesSaveCount, 0)
})

test('future app or preference schemas abort bootstrap without writing backwards', async () => {
  const futureAppBridge = createBridge(async () => ({
    appState: { schemaVersion: APP_STATE_SCHEMA_VERSION + 1 },
    preferences: null,
  }))
  await assert.rejects(
    () => loadDesktopBootstrap(futureAppBridge),
    UnsupportedAppStateVersionError,
  )
  assert.equal(futureAppBridge.appStateSaveCount, 0)

  const futurePreferencesBridge = createBridge(async () => ({
    appState: null,
    preferences: { schemaVersion: DESKTOP_PREFERENCES_SCHEMA_VERSION + 1 },
  }))
  await assert.rejects(
    () => loadDesktopBootstrap(futurePreferencesBridge),
    UnsupportedDesktopPreferencesVersionError,
  )
  assert.equal(futurePreferencesBridge.preferencesSaveCount, 0)
})
