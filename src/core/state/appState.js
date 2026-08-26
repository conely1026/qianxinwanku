import { getRates, isValidSchedule } from '../../lib/time.js'

export const APP_STATE_SCHEMA_VERSION = 1
export const APP_STATE_VERSION = APP_STATE_SCHEMA_VERSION

export const DEFAULT_CONVERSION_ITEMS = [
  { id: 'coffee', name: '一杯咖啡', price: 15 },
  { id: 'lunch', name: '一顿午饭', price: 35 },
  { id: 'movie', name: '一张电影票', price: 55 },
  { id: 'show', name: '一场演出', price: 680 },
  { id: 'sneakers', name: '一双球鞋', price: 899 },
  { id: 'shoes', name: '球鞋', price: 699 },
]

export const DEFAULT_STATE = {
  schemaVersion: APP_STATE_SCHEMA_VERSION,
  settings: {
    monthlySalary: 3000,
    workdays: 22,
    startTime: '09:00',
    endTime: '18:00',
    endDayOffset: 0,
    lunchStart: '12:00',
    lunchEnd: '13:00',
    payday: 10,
    displayBasis: 'gross',
  },
  conversionItems: DEFAULT_CONVERSION_ITEMS,
  attendance: {},
  leaveSession: {
    running: false,
    startedAt: null,
    accumulatedSeconds: 0,
    periodStartedAt: null,
  },
  headphone: {
    price: 1299,
    hours: 100,
  },
  lastView: 'today',
}

const IMPORTABLE_APP_VIEWS = new Set(['today', 'convert', 'calendar', 'profile'])
const REQUIRED_BACKUP_OBJECT_FIELDS = ['settings', 'attendance', 'leaveSession', 'headphone']
const TIME_VALUE_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const SCHEDULE_SETTING_FIELDS = [
  'startTime',
  'endTime',
  'endDayOffset',
  'lunchStart',
  'lunchEnd',
]

export class AppStateImportError extends TypeError {
  constructor(message) {
    super(message)
    this.name = 'AppStateImportError'
    this.code = 'APP_STATE_IMPORT_INVALID'
  }
}

export class UnsupportedAppStateVersionError extends TypeError {
  constructor(version) {
    super(`App state schema version ${version} is newer than this app supports.`)
    this.name = 'UnsupportedAppStateVersionError'
    this.code = 'APP_STATE_VERSION_FUTURE'
    this.version = version
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object'
}

function isRecord(value) {
  return isObject(value) && !Array.isArray(value)
}

export function classifyAppStateVersion(value) {
  if (!isRecord(value)) return 'invalid'

  const hasSchemaVersion = Object.hasOwn(value, 'schemaVersion')
  const hasLegacyVersion = Object.hasOwn(value, 'version')
  if (hasSchemaVersion && hasLegacyVersion) {
    const schemaKind = classifyVersionNumber(value.schemaVersion, 'current')
    const legacyKind = classifyVersionNumber(value.version, 'legacy-current')
    if (schemaKind === 'future' || legacyKind === 'future') return 'future'
    if (schemaKind !== 'current' || legacyKind !== 'legacy-current') return 'invalid'
    return value.schemaVersion === value.version ? 'current' : 'invalid'
  }
  if (hasSchemaVersion) return classifyVersionNumber(value.schemaVersion, 'current')
  if (hasLegacyVersion) {
    return classifyVersionNumber(value.version, 'legacy-current')
  }
  return 'missing'
}

export function isImportableAppState(value) {
  const versionKind = classifyAppStateVersion(value)
  if (versionKind !== 'current' && versionKind !== 'legacy-current') return false

  const hasRequiredObjects = REQUIRED_BACKUP_OBJECT_FIELDS.every(
    (field) => Object.hasOwn(value, field) && isRecord(value[field]),
  )
  if (!hasRequiredObjects) return false
  if (!isImportableAppSettings(value.settings)) return false

  const hasCurrentItems = Object.hasOwn(value, 'conversionItems')
    && Array.isArray(value.conversionItems)
  const hasLegacyItems = Object.hasOwn(value, 'customItems')
    && Array.isArray(value.customItems)

  return (hasCurrentItems || hasLegacyItems)
    && Object.hasOwn(value, 'lastView')
    && IMPORTABLE_APP_VIEWS.has(value.lastView)
}

export function assertImportableAppState(value) {
  if (!isImportableAppState(value)) {
    throw new AppStateImportError(
      'Imported data must be a complete backup for the current app state version.',
    )
  }
  return value
}

export function migrateState(value) {
  const versionKind = classifyAppStateVersion(value)
  if (versionKind === 'future') {
    const version = Math.max(
      ...[value.schemaVersion, value.version].filter(Number.isInteger),
    )
    throw new UnsupportedAppStateVersionError(version)
  }
  if (versionKind !== 'current' && versionKind !== 'legacy-current') return null

  const { customItems, version: _legacyVersion, ...currentValue } = value
  const currentState = {
    ...currentValue,
    schemaVersion: APP_STATE_SCHEMA_VERSION,
  }
  if (Array.isArray(currentState.conversionItems)) return currentState

  return {
    ...currentState,
    conversionItems: [
      ...DEFAULT_CONVERSION_ITEMS,
      ...(Array.isArray(customItems) ? customItems : []),
    ],
  }
}

export function normalizeConversionItems(items, { createId } = {}) {
  return items
    .filter(isObject)
    .map((item) => ({
      id: String(item.id || requireGeneratedId(createId)),
      name: String(item.name || '').trim(),
      price: Number(item.price),
    }))
    .filter((item) => item.name && Number.isFinite(item.price) && item.price > 0)
}

export function normalizeState(value, options = {}) {
  const migratedState = migrateState(value)
  if (!migratedState) return DEFAULT_STATE

  return {
    ...DEFAULT_STATE,
    ...migratedState,
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    settings: normalizeAppSettings(migratedState.settings),
    conversionItems: normalizeConversionItems(migratedState.conversionItems, options),
    attendance: isObject(migratedState.attendance) ? migratedState.attendance : {},
    leaveSession: {
      ...DEFAULT_STATE.leaveSession,
      ...(isObject(migratedState.leaveSession) ? migratedState.leaveSession : {}),
    },
    headphone: {
      ...DEFAULT_STATE.headphone,
      ...(isObject(migratedState.headphone) ? migratedState.headphone : {}),
    },
  }
}

function classifyVersionNumber(version, currentKind) {
  if (!Number.isInteger(version) || version < 1) return 'invalid'
  if (version > APP_STATE_SCHEMA_VERSION) return 'future'
  if (version === APP_STATE_SCHEMA_VERSION) return currentKind
  return 'unsupported'
}

function isImportableAppSettings(settings) {
  if (!isRecord(settings)) return false

  const candidate = { ...DEFAULT_STATE.settings, ...settings }
  if (!isFiniteNumberInRange(candidate.monthlySalary, 0)) return false
  if (!isIntegerInRange(candidate.workdays, 1, 31)) return false
  if (!isIntegerInRange(candidate.payday, 1, 31)) return false
  if (!isIntegerInRange(candidate.endDayOffset, 0, 1)) return false
  if (!['gross', 'net'].includes(candidate.displayBasis)) return false
  if (![candidate.startTime, candidate.endTime, candidate.lunchStart, candidate.lunchEnd]
    .every(isTimeValue)) return false

  return isValidSchedule(candidate) && hasFiniteRates(candidate)
}

function normalizeAppSettings(settings) {
  if (!isRecord(settings)) return { ...DEFAULT_STATE.settings }

  const normalized = {
    monthlySalary: normalizeFiniteNumber(settings.monthlySalary, DEFAULT_STATE.settings.monthlySalary, 0),
    workdays: normalizeInteger(settings.workdays, DEFAULT_STATE.settings.workdays, 1, 31),
    startTime: normalizeTimeValue(settings.startTime, DEFAULT_STATE.settings.startTime),
    endTime: normalizeTimeValue(settings.endTime, DEFAULT_STATE.settings.endTime),
    endDayOffset: normalizeInteger(settings.endDayOffset, DEFAULT_STATE.settings.endDayOffset, 0, 1),
    lunchStart: normalizeTimeValue(settings.lunchStart, DEFAULT_STATE.settings.lunchStart),
    lunchEnd: normalizeTimeValue(settings.lunchEnd, DEFAULT_STATE.settings.lunchEnd),
    payday: normalizeInteger(settings.payday, DEFAULT_STATE.settings.payday, 1, 31),
    displayBasis: ['gross', 'net'].includes(settings.displayBasis)
      ? settings.displayBasis
      : DEFAULT_STATE.settings.displayBasis,
  }

  if (!isValidSchedule(normalized)) {
    for (const field of SCHEDULE_SETTING_FIELDS) {
      normalized[field] = DEFAULT_STATE.settings[field]
    }
  }
  if (!hasFiniteRates(normalized)) {
    normalized.monthlySalary = DEFAULT_STATE.settings.monthlySalary
  }
  return normalized
}

function hasFiniteRates(settings) {
  return Object.values(getRates(settings)).every(Number.isFinite)
}

function isTimeValue(value) {
  return typeof value === 'string' && TIME_VALUE_PATTERN.test(value)
}

function normalizeTimeValue(value, fallback) {
  return isTimeValue(value) ? value : fallback
}

function toFiniteNumber(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function isFiniteNumberInRange(value, minimum, maximum = Number.POSITIVE_INFINITY) {
  const number = toFiniteNumber(value)
  return number !== null && number >= minimum && number <= maximum
}

function isIntegerInRange(value, minimum, maximum) {
  const number = toFiniteNumber(value)
  return number !== null
    && Number.isInteger(number)
    && number >= minimum
    && number <= maximum
}

function normalizeFiniteNumber(value, fallback, minimum, maximum = Number.POSITIVE_INFINITY) {
  return isFiniteNumberInRange(value, minimum, maximum) ? Number(value) : fallback
}

function normalizeInteger(value, fallback, minimum, maximum) {
  return isIntegerInRange(value, minimum, maximum) ? Number(value) : fallback
}

function requireGeneratedId(createId) {
  if (typeof createId !== 'function') {
    throw new TypeError('normalizeState requires createId when a conversion item has no id')
  }
  return createId()
}
