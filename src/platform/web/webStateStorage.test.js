import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APP_STATE_SCHEMA_VERSION,
  DEFAULT_CONVERSION_ITEMS,
  UnsupportedAppStateVersionError,
} from '../../core/state/appState.js'
import { createWebStateStorage, STORAGE_KEY } from './webStateStorage.js'

function createMemoryStorage(initialValue = null) {
  const values = new Map()
  let writeCount = 0
  if (initialValue !== null) values.set(STORAGE_KEY, initialValue)
  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      writeCount += 1
      values.set(key, value)
    },
    get writeCount() {
      return writeCount
    },
  }
}

function createStorageEventTarget() {
  const listeners = new Set()
  return {
    addEventListener(type, listener) {
      if (type === 'storage') listeners.add(listener)
    },
    removeEventListener(type, listener) {
      if (type === 'storage') listeners.delete(listener)
    },
    dispatch(event) {
      for (const listener of listeners) listener(event)
    },
  }
}

test('reads legacy browser data through core migration and writes current state', () => {
  const storage = createMemoryStorage(JSON.stringify({
    version: 1,
    customItems: [{ name: '旧项目', price: '12' }],
  }))
  const adapter = createWebStateStorage({
    storage,
    createId: () => 'generated-id',
  })

  const state = adapter.read()
  assert.equal(state.conversionItems.length, DEFAULT_CONVERSION_ITEMS.length + 1)
  assert.deepEqual(state.conversionItems.at(-1), {
    id: 'generated-id',
    name: '旧项目',
    price: 12,
  })

  assert.equal(adapter.write(state), true)
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), state)
})

test('subscribes only to valid updates for the app storage key and cleans up', () => {
  const eventTarget = createStorageEventTarget()
  const adapter = createWebStateStorage({
    storage: createMemoryStorage(),
    eventTarget,
    createId: () => 'event-id',
  })
  const received = []
  const unsubscribe = adapter.subscribe((state) => received.push(state))

  eventTarget.dispatch({ key: 'other:key', newValue: JSON.stringify({ version: 1 }) })
  eventTarget.dispatch({ key: STORAGE_KEY, newValue: null })
  eventTarget.dispatch({ key: STORAGE_KEY, newValue: '{malformed' })
  eventTarget.dispatch({
    key: STORAGE_KEY,
    newValue: JSON.stringify({
      version: 1,
      conversionItems: [{ name: '跨标签页项目', price: 20 }],
    }),
  })

  assert.equal(received.length, 1)
  assert.deepEqual(received[0].conversionItems, [{
    id: 'event-id',
    name: '跨标签页项目',
    price: 20,
  }])

  unsubscribe()
  eventTarget.dispatch({ key: STORAGE_KEY, newValue: JSON.stringify({ version: 1 }) })
  assert.equal(received.length, 1)
})

test('falls back safely when browser storage is unavailable or malformed', () => {
  const unavailableStorage = {
    getItem() {
      throw new Error('unavailable')
    },
    setItem() {
      throw new Error('unavailable')
    },
  }
  const adapter = createWebStateStorage({ storage: unavailableStorage })

  assert.equal(adapter.read().schemaVersion, APP_STATE_SCHEMA_VERSION)
  assert.equal(adapter.write({ schemaVersion: APP_STATE_SCHEMA_VERSION }), false)

  const malformedAdapter = createWebStateStorage({
    storage: createMemoryStorage('{malformed'),
  })
  assert.equal(malformedAdapter.read().schemaVersion, APP_STATE_SCHEMA_VERSION)
})

test('never downgrades or writes over a future app state schema', () => {
  const futureState = JSON.stringify({
    schemaVersion: APP_STATE_SCHEMA_VERSION + 1,
    futureField: 'must survive',
  })
  const storage = createMemoryStorage(futureState)
  const adapter = createWebStateStorage({ storage })

  assert.throws(
    () => adapter.read(),
    (error) => error instanceof UnsupportedAppStateVersionError
      && error.code === 'APP_STATE_VERSION_FUTURE',
  )
  assert.equal(adapter.write({ schemaVersion: APP_STATE_SCHEMA_VERSION }), false)
  assert.equal(storage.writeCount, 0)
  assert.equal(storage.getItem(STORAGE_KEY), futureState)
})
