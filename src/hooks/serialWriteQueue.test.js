import test from 'node:test'
import assert from 'node:assert/strict'
import { createSerialWriteQueue } from './serialWriteQueue.js'

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

test('serializes async writes so a later value cannot overtake a slow earlier value', async () => {
  const firstWrite = createDeferred()
  const secondWrite = createDeferred()
  const started = []
  let activeWrites = 0
  let maximumActiveWrites = 0
  const queue = createSerialWriteQueue(async (value) => {
    started.push(value)
    activeWrites += 1
    maximumActiveWrites = Math.max(maximumActiveWrites, activeWrites)
    await (value === 'first' ? firstWrite.promise : secondWrite.promise)
    activeWrites -= 1
  })

  const first = queue.enqueue('first')
  const second = queue.enqueue('second')
  await Promise.resolve()

  assert.deepEqual(started, ['first'])
  firstWrite.resolve()
  await first
  await Promise.resolve()
  assert.deepEqual(started, ['first', 'second'])

  secondWrite.resolve()
  await second
  await queue.whenIdle()
  assert.equal(maximumActiveWrites, 1)
})

test('a rejected write does not block the next queued value', async () => {
  const started = []
  const queue = createSerialWriteQueue(async (value) => {
    started.push(value)
    if (value === 'broken') throw new Error('write failed')
  })

  const broken = queue.enqueue('broken')
  const recovered = queue.enqueue('recovered')

  await assert.rejects(broken, /write failed/)
  await recovered
  await queue.whenIdle()
  assert.deepEqual(started, ['broken', 'recovered'])
})
