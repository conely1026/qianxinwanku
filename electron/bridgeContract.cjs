'use strict'

const DEFAULT_WINDOW_SIZE = Object.freeze({ width: 360, height: 76 })

const IPC_CHANNELS = Object.freeze({
  EXPORT_BACKUP: 'desktop:export-backup',
  IMPORT_BACKUP: 'desktop:import-backup',
  LOAD_BOOTSTRAP: 'desktop:load-bootstrap',
  RESIZE_WINDOW: 'desktop:resize-window',
  SAVE_APP_STATE: 'desktop:save-app-state',
  SAVE_PREFERENCES: 'desktop:save-preferences',
  SET_ALWAYS_ON_TOP: 'desktop:set-always-on-top',
  TOGGLE_VISIBILITY: 'desktop:toggle-visibility',
})

const APP_STATE_MAX_BYTES = 2 * 1024 * 1024
const PREFERENCES_MAX_BYTES = 64 * 1024
const APP_STATE_FIELDS = new Set([
  'schemaVersion',
  'settings',
  'conversionItems',
  'attendance',
  'leaveSession',
  'headphone',
  'lastView',
])
const PREFERENCES_FIELDS = new Set([
  'schemaVersion',
  'selectedSkinId',
  'scale',
  'alwaysOnTop',
  'locked',
  'closeBehavior',
  'windowBounds',
  'lastSeenReleaseId',
])
const WINDOW_BOUND_FIELDS = new Set(['x', 'y', 'width', 'height'])
const SUPPORTED_SCALES = new Set([1, 1.25, 1.5, 2])

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function assertKnownFields(value, supportedFields, label) {
  for (const field of Object.keys(value)) {
    if (!supportedFields.has(field)) {
      throw new TypeError(`${label} contains unsupported field: ${field}`)
    }
  }
}

function assertCurrentSchemaVersion(value, label) {
  if (value !== 1) {
    throw new TypeError(`${label}.schemaVersion must be the current version 1`)
  }
}

function assertJsonSize(value, label, maximumBytes) {
  let serialized
  try {
    serialized = JSON.stringify(value)
  } catch {
    throw new TypeError(`${label} must be JSON serializable`)
  }
  if (serialized === undefined) {
    throw new TypeError(`${label} must be JSON serializable`)
  }
  if (Buffer.byteLength(serialized, 'utf8') > maximumBytes) {
    throw new RangeError(`${label} is too large`)
  }
}

function assertAppStatePayload(value) {
  if (!isPlainObject(value)) {
    throw new TypeError('appState must be a plain object')
  }
  assertKnownFields(value, APP_STATE_FIELDS, 'appState')
  assertCurrentSchemaVersion(value.schemaVersion, 'appState')
  assertJsonSize(value, 'appState', APP_STATE_MAX_BYTES)
  return value
}

function assertBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${label} must be a boolean`)
  }
  return value
}

function assertIntegerInRange(value, label, minimum, maximum) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer`)
  }
  if (value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}`)
  }
  return value
}

function assertWindowSize(value) {
  if (!isPlainObject(value)) {
    throw new TypeError('window size must be a plain object')
  }
  assertKnownFields(value, new Set(['width', 'height']), 'window size')
  return {
    width: assertIntegerInRange(value.width, 'width', 300, 900),
    height: assertIntegerInRange(value.height, 'height', 70, 900),
  }
}

function assertWindowBounds(value) {
  if (!isPlainObject(value)) {
    throw new TypeError('windowBounds must be a plain object')
  }
  assertKnownFields(value, WINDOW_BOUND_FIELDS, 'windowBounds')
  const size = assertWindowSize({ width: value.width, height: value.height })
  return {
    x: assertIntegerInRange(value.x, 'windowBounds.x', -100_000, 100_000),
    y: assertIntegerInRange(value.y, 'windowBounds.y', -100_000, 100_000),
    ...size,
  }
}

function assertPreferencesPayload(value) {
  if (!isPlainObject(value)) {
    throw new TypeError('preferences must be a plain object')
  }
  assertKnownFields(value, PREFERENCES_FIELDS, 'preferences')
  assertCurrentSchemaVersion(value.schemaVersion, 'preferences')
  if (typeof value.selectedSkinId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(value.selectedSkinId)) {
    throw new TypeError('preferences.selectedSkinId must be a safe non-empty identifier')
  }
  if (!SUPPORTED_SCALES.has(value.scale)) {
    throw new RangeError('preferences.scale is unsupported')
  }
  assertBoolean(value.alwaysOnTop, 'preferences.alwaysOnTop')
  assertBoolean(value.locked, 'preferences.locked')
  if (value.closeBehavior !== 'hide' && value.closeBehavior !== 'quit') {
    throw new TypeError('preferences.closeBehavior must be hide or quit')
  }
  if (value.windowBounds !== null) assertWindowBounds(value.windowBounds)
  if (
    value.lastSeenReleaseId !== undefined
    && value.lastSeenReleaseId !== null
    && (typeof value.lastSeenReleaseId !== 'string' || value.lastSeenReleaseId.length > 128)
  ) {
    throw new TypeError('preferences.lastSeenReleaseId must be null or a short string')
  }
  assertJsonSize(value, 'preferences', PREFERENCES_MAX_BYTES)
  return value
}

function validateDesktopDevUrl(value) {
  if (value === undefined || value === '') return null
  if (typeof value !== 'string') {
    throw new TypeError('QIANXINWANKU_DESKTOP_DEV_URL must be a string')
  }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new TypeError('QIANXINWANKU_DESKTOP_DEV_URL must be a valid URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError('QIANXINWANKU_DESKTOP_DEV_URL must use http or https')
  }
  if (!new Set(['localhost', '127.0.0.1', '[::1]', '::1']).has(parsed.hostname)) {
    throw new TypeError('QIANXINWANKU_DESKTOP_DEV_URL must use a loopback host')
  }
  if (parsed.username || parsed.password) {
    throw new TypeError('QIANXINWANKU_DESKTOP_DEV_URL must not contain credentials')
  }
  return parsed.href
}

module.exports = {
  APP_STATE_MAX_BYTES,
  DEFAULT_WINDOW_SIZE,
  IPC_CHANNELS,
  PREFERENCES_MAX_BYTES,
  assertAppStatePayload,
  assertBoolean,
  assertPreferencesPayload,
  assertWindowBounds,
  assertWindowSize,
  validateDesktopDevUrl,
}
