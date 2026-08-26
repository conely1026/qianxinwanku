const test = require('node:test')
const assert = require('node:assert/strict')

const {
  DEFAULT_WINDOW_SIZE,
  IPC_CHANNELS,
  assertAppStatePayload,
  assertBoolean,
  assertPreferencesPayload,
  assertWindowSize,
  validateDesktopDevUrl,
} = require('./bridgeContract.cjs')

test('exposes a fixed IPC channel and default window contract', () => {
  assert.deepEqual(DEFAULT_WINDOW_SIZE, { width: 360, height: 76 })
  assert.deepEqual(Object.values(IPC_CHANNELS).sort(), [
    'desktop:export-backup',
    'desktop:import-backup',
    'desktop:load-bootstrap',
    'desktop:resize-window',
    'desktop:save-app-state',
    'desktop:save-preferences',
    'desktop:set-always-on-top',
    'desktop:toggle-visibility',
  ])
})

test('accepts only bounded plain AppState payloads with known root keys', () => {
  const state = {
    schemaVersion: 1,
    settings: {},
    conversionItems: [],
    attendance: {},
    leaveSession: {},
    headphone: {},
    lastView: 'today',
  }

  assert.equal(assertAppStatePayload(state), state)
  assert.throws(() => assertAppStatePayload([]), /plain object/)
  assert.throws(() => assertAppStatePayload({ schemaVersion: 2 }), /current version/)
  assert.throws(() => assertAppStatePayload({ ...state, executable: 'no' }), /unsupported field/)
  assert.throws(
    () => assertAppStatePayload({ ...state, attendance: { huge: 'x'.repeat(2_100_000) } }),
    /too large/,
  )
})

test('validates the complete DesktopPreferences payload and window bounds', () => {
  const preferences = {
    schemaVersion: 1,
    selectedSkinId: 'office-cat',
    scale: 1.25,
    alwaysOnTop: true,
    locked: false,
    closeBehavior: 'hide',
    windowBounds: { x: -1200, y: 30, width: 330, height: 320 },
  }

  assert.equal(assertPreferencesPayload(preferences), preferences)
  assert.throws(
    () => assertPreferencesPayload({ ...preferences, scale: 1.3 }),
    /scale/,
  )
  assert.throws(
    () => assertPreferencesPayload({ ...preferences, windowBounds: { x: 0, y: 0, width: 100, height: 50 } }),
    /width/,
  )
})

test('allows the frozen capsule and cat sizes while rejecting unsafe resize input', () => {
  assert.deepEqual(assertWindowSize({ width: 430, height: 70 }), { width: 430, height: 70 })
  assert.deepEqual(assertWindowSize({ width: 330, height: 320 }), { width: 330, height: 320 })
  assert.throws(() => assertWindowSize({ width: 299, height: 320 }), /width/)
  assert.throws(() => assertWindowSize({ width: 430.5, height: 70 }), /integer/)
  assert.throws(() => assertWindowSize({ width: 430, height: 901 }), /height/)
  assert.equal(assertBoolean(true, 'alwaysOnTop'), true)
  assert.throws(() => assertBoolean(1, 'alwaysOnTop'), /boolean/)
})

test('permits only explicit loopback development URLs', () => {
  assert.equal(validateDesktopDevUrl(undefined), null)
  assert.equal(validateDesktopDevUrl('http://127.0.0.1:5173/'), 'http://127.0.0.1:5173/')
  assert.equal(validateDesktopDevUrl('https://localhost:4173/widget'), 'https://localhost:4173/widget')
  assert.throws(() => validateDesktopDevUrl('https://example.com/'), /loopback/)
  assert.throws(() => validateDesktopDevUrl('file:///tmp/index.html'), /http/)
})
