import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyLocalPersistentUpdate,
  applySubscribedPersistentData,
  createPersistentSnapshot,
  reportPersistentWriteError,
  resolveInitialPersistentData,
} from './persistentStateCore.js'

test('sync Web initialization reads once and starts without a pending write', () => {
  const stored = { value: 'stored' }
  const calls = []
  const storage = {
    read() {
      calls.push('read')
      return stored
    },
    normalize() {
      calls.push('normalize')
    },
  }

  const snapshot = createPersistentSnapshot(resolveInitialPersistentData(storage))

  assert.equal(snapshot.data, stored)
  assert.equal(snapshot.pendingWrite, null)
  assert.deepEqual(calls, ['read'])
})

test('a preloaded desktop initial state is normalized without calling sync read', () => {
  const preloaded = { value: 'preloaded' }
  const normalized = { value: 'normalized' }
  const calls = []
  const storage = {
    read() {
      calls.push('read')
      return { value: 'wrong' }
    },
    normalize(value) {
      calls.push(['normalize', value])
      return normalized
    },
  }

  const snapshot = createPersistentSnapshot(resolveInitialPersistentData(
    storage,
    { initialState: preloaded },
  ))

  assert.equal(snapshot.data, normalized)
  assert.equal(snapshot.pendingWrite, null)
  assert.deepEqual(calls, [['normalize', preloaded]])
})

test('read and normalize failures propagate before any write can be scheduled', () => {
  assert.throws(
    () => resolveInitialPersistentData({ read: () => { throw new Error('read failed') } }),
    /read failed/,
  )

  assert.throws(
    () => resolveInitialPersistentData(
      { normalize: () => { throw new Error('normalize failed') } },
      { initialState: {} },
    ),
    /normalize failed/,
  )
})

test('only local updates create pending writes while subscribed data stays read-only', () => {
  const initial = createPersistentSnapshot({ count: 0 })
  const local = applyLocalPersistentUpdate(initial, (current) => ({
    count: current.count + 1,
  }))
  const subscribedData = { count: 7 }
  const subscribed = applySubscribedPersistentData(local, subscribedData)

  assert.deepEqual(local.data, { count: 1 })
  assert.equal(local.pendingWrite.data, local.data)
  assert.equal(subscribed.data, subscribedData)
  assert.equal(subscribed.pendingWrite, local.pendingWrite)
  assert.equal(applyLocalPersistentUpdate(local, (current) => current), local)
})

test('write errors use the optional adapter callback without leaking callback failures', () => {
  const writeError = new Error('write failed')
  const reported = []

  reportPersistentWriteError({
    onWriteError(error) {
      reported.push(error)
    },
  }, writeError)
  assert.deepEqual(reported, [writeError])

  assert.doesNotThrow(() => reportPersistentWriteError({}, writeError))
  assert.doesNotThrow(() => reportPersistentWriteError({
    onWriteError() {
      throw new Error('report failed')
    },
  }, writeError))
})
