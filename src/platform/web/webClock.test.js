import test from 'node:test'
import assert from 'node:assert/strict'
import { createWebClock } from './webClock.js'

test('clock adapter returns cleanup functions for interval and timeout schedulers', () => {
  const cleared = []
  const clock = createWebClock({
    now: () => new Date(2026, 7, 26, 10, 0, 0),
    setIntervalFn: () => 'interval-id',
    clearIntervalFn: (timer) => cleared.push(timer),
    setTimeoutFn: () => 'timeout-id',
    clearTimeoutFn: (timer) => cleared.push(timer),
  })

  const stopInterval = clock.setInterval(() => {}, 1000)
  const stopTimeout = clock.setTimeout(() => {}, 2400)
  stopInterval()
  stopTimeout()

  assert.equal(clock.now().getHours(), 10)
  assert.deepEqual(cleared, ['interval-id', 'timeout-id'])
})
