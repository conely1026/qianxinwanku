import test from 'node:test'
import assert from 'node:assert/strict'
import { createDesktopClock } from './desktopClock.js'

test('desktop clock exposes cancellable interval and timeout adapters', () => {
  const cleared = []
  const clock = createDesktopClock({
    now: () => new Date(2026, 7, 26),
    setIntervalFn: () => 11,
    clearIntervalFn: (timer) => cleared.push(['interval', timer]),
    setTimeoutFn: () => 12,
    clearTimeoutFn: (timer) => cleared.push(['timeout', timer]),
  })

  assert.equal(clock.now().getFullYear(), 2026)
  clock.setInterval(() => {}, 1000)()
  clock.setTimeout(() => {}, 1000)()
  assert.deepEqual(cleared, [['interval', 11], ['timeout', 12]])
})
