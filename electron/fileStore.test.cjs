const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const {
  createDesktopDataStore,
  getDesktopDataPaths,
} = require('./fileStore.cjs')

async function createTemporaryUserData(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'qianxinwanku-electron-test-'))
  t.after(async () => fs.rm(directory, { recursive: true, force: true }))
  return directory
}

function createAppState(lastView) {
  return {
    schemaVersion: 1,
    settings: {},
    conversionItems: [],
    attendance: {},
    leaveSession: {},
    headphone: {},
    lastView,
  }
}

function createPreferences() {
  return {
    schemaVersion: 1,
    selectedSkinId: 'capsule',
    scale: 1,
    alwaysOnTop: true,
    locked: false,
    closeBehavior: 'hide',
    windowBounds: { x: 10, y: 20, width: 430, height: 70 },
  }
}

test('uses only the two fixed files under userData and serializes atomic writes', async (t) => {
  const userDataPath = await createTemporaryUserData(t)
  const paths = getDesktopDataPaths(userDataPath)
  const store = createDesktopDataStore(userDataPath)
  const first = createAppState('today')
  const second = createAppState('calendar')
  const preferences = createPreferences()

  assert.deepEqual(paths, {
    appStatePath: path.join(userDataPath, 'app-state.json'),
    preferencesPath: path.join(userDataPath, 'desktop-preferences.json'),
  })

  await Promise.all([
    store.saveAppState(first),
    store.saveAppState(second),
    store.savePreferences(preferences),
  ])

  assert.deepEqual(await store.loadBootstrap(), {
    appState: second,
    preferences,
  })
  assert.deepEqual(
    (await fs.readdir(userDataPath)).sort(),
    ['app-state.json', 'desktop-preferences.json'],
  )
})

test('returns null for a corrupt fixed file without reading a renderer-provided path', async (t) => {
  const userDataPath = await createTemporaryUserData(t)
  const paths = getDesktopDataPaths(userDataPath)
  const store = createDesktopDataStore(userDataPath)
  const preferences = createPreferences()

  await fs.writeFile(paths.appStatePath, '{broken', 'utf8')
  await store.savePreferences(preferences)

  assert.deepEqual(await store.loadBootstrap(), {
    appState: null,
    preferences,
  })
  assert.equal('path' in store, false)
})

test('returns legacy and future roots unchanged so the renderer owns migration and protection', async (t) => {
  const userDataPath = await createTemporaryUserData(t)
  const paths = getDesktopDataPaths(userDataPath)
  const store = createDesktopDataStore(userDataPath)
  const legacyAppState = { version: 1, legacyMarker: 'migrate me' }
  const futurePreferences = { schemaVersion: 2, unknownFutureField: true }

  await fs.writeFile(paths.appStatePath, JSON.stringify(legacyAppState), 'utf8')
  await fs.writeFile(paths.preferencesPath, JSON.stringify(futurePreferences), 'utf8')

  assert.deepEqual(await store.loadBootstrap(), {
    appState: legacyAppState,
    preferences: futurePreferences,
  })
})

test('rejects invalid save payloads before touching either data file', async (t) => {
  const userDataPath = await createTemporaryUserData(t)
  const store = createDesktopDataStore(userDataPath)

  await assert.rejects(store.saveAppState({ schemaVersion: 1, extra: true }), /unsupported field/)
  await assert.rejects(store.saveAppState({ schemaVersion: 2 }), /current version/)
  await assert.rejects(store.savePreferences({ schemaVersion: 1 }), /selectedSkinId/)
  await assert.rejects(
    store.savePreferences({ ...createPreferences(), schemaVersion: 2, unknownFutureField: true }),
    /unsupported field|current version/,
  )
  assert.deepEqual(await fs.readdir(userDataPath), [])
})
