import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AppStateImportError,
  APP_STATE_SCHEMA_VERSION,
  APP_STATE_VERSION,
  assertImportableAppState,
  classifyAppStateVersion,
  DEFAULT_CONVERSION_ITEMS,
  DEFAULT_STATE,
  isImportableAppState,
  migrateState,
  normalizeState,
  UnsupportedAppStateVersionError,
} from './appState.js'
import { getRates, isValidSchedule } from '../../lib/time.js'

function createCompleteBackup(overrides = {}) {
  return {
    ...DEFAULT_STATE,
    settings: { ...DEFAULT_STATE.settings },
    conversionItems: [...DEFAULT_STATE.conversionItems],
    attendance: {},
    leaveSession: { ...DEFAULT_STATE.leaveSession },
    headphone: { ...DEFAULT_STATE.headphone },
    ...overrides,
  }
}

test('returns the current default state for absent or unsupported data', () => {
  assert.equal(normalizeState(null), DEFAULT_STATE)
  assert.equal(normalizeState({ version: 0 }), DEFAULT_STATE)
})

test('classifies schema versions and refuses to downgrade future state', () => {
  assert.equal(
    classifyAppStateVersion({ schemaVersion: APP_STATE_SCHEMA_VERSION }),
    'current',
  )
  assert.equal(classifyAppStateVersion({ version: APP_STATE_VERSION }), 'legacy-current')
  assert.equal(
    classifyAppStateVersion({ schemaVersion: APP_STATE_SCHEMA_VERSION + 1 }),
    'future',
  )
  assert.equal(
    classifyAppStateVersion({
      schemaVersion: APP_STATE_SCHEMA_VERSION,
      version: APP_STATE_VERSION + 1,
    }),
    'future',
  )
  assert.equal(classifyAppStateVersion({}), 'missing')
  assert.equal(classifyAppStateVersion([]), 'invalid')

  assert.throws(
    () => normalizeState({ schemaVersion: APP_STATE_SCHEMA_VERSION + 1 }),
    (error) => error instanceof UnsupportedAppStateVersionError
      && error.code === 'APP_STATE_VERSION_FUTURE',
  )
})

test('normalizes legacy version markers to schemaVersion', () => {
  const state = normalizeState({ version: APP_STATE_VERSION, conversionItems: [] })

  assert.equal(state.schemaVersion, APP_STATE_SCHEMA_VERSION)
  assert.equal('version' in state, false)
})

test('migrates legacy custom items after presets without retaining the legacy field', () => {
  const legacyItem = { id: 'legacy-item', name: '旧自定义项目', price: 88 }
  const migrated = migrateState({ version: APP_STATE_VERSION, customItems: [legacyItem] })

  assert.equal(migrated.conversionItems.length, DEFAULT_CONVERSION_ITEMS.length + 1)
  assert.deepEqual(
    migrated.conversionItems.slice(0, DEFAULT_CONVERSION_ITEMS.length).map((item) => item.id),
    ['coffee', 'lunch', 'movie', 'show', 'sneakers', 'shoes'],
  )
  assert.deepEqual(migrated.conversionItems.at(-1), legacyItem)
  assert.equal('customItems' in migrated, false)
})

test('normalizes imported data while preserving current fields and deleted presets', () => {
  const state = normalizeState({
    version: APP_STATE_VERSION,
    settings: { monthlySalary: 9000 },
    conversionItems: [],
    attendance: { '2026-08-26': 'work' },
    leaveSession: { running: true, startedAt: 123 },
    headphone: { hours: 8 },
    lastView: 'convert',
  })

  assert.equal(state.settings.monthlySalary, 9000)
  assert.equal(state.settings.endDayOffset, DEFAULT_STATE.settings.endDayOffset)
  assert.deepEqual(state.conversionItems, [])
  assert.deepEqual(state.attendance, { '2026-08-26': 'work' })
  assert.equal(state.leaveSession.running, true)
  assert.equal(state.leaveSession.accumulatedSeconds, 0)
  assert.equal(state.headphone.hours, 8)
  assert.equal(state.headphone.price, DEFAULT_STATE.headphone.price)
  assert.equal(state.lastView, 'convert')
})

test('normalizes invalid work settings to values safe for time calculations', () => {
  const state = normalizeState({
    version: APP_STATE_VERSION,
    settings: {
      monthlySalary: 'not-a-number',
      workdays: 0,
      startTime: '25:00',
      endTime: '08:00',
      endDayOffset: 7,
      lunchStart: '08:30',
      lunchEnd: '08:00',
      payday: 32,
      displayBasis: 'unknown',
    },
    conversionItems: [],
  })

  assert.deepEqual(state.settings, DEFAULT_STATE.settings)
  assert.equal(isValidSchedule(state.settings), true)
  assert.equal(
    Object.values(getRates(state.settings)).every(Number.isFinite),
    true,
  )
})

test('keeps valid numeric work settings while repairing an invalid schedule as a group', () => {
  const state = normalizeState({
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    settings: {
      ...DEFAULT_STATE.settings,
      monthlySalary: '9000.5',
      workdays: '20',
      startTime: '18:00',
      endTime: '09:00',
      endDayOffset: 0,
      lunchStart: '19:00',
      lunchEnd: '20:00',
      payday: '15',
      displayBasis: 'net',
    },
    conversionItems: [],
  })

  assert.deepEqual(state.settings, {
    ...DEFAULT_STATE.settings,
    monthlySalary: 9000.5,
    workdays: 20,
    payday: 15,
    displayBasis: 'net',
  })
})

test('uses the injected id factory only for conversion items without an id', () => {
  const issuedIds = ['generated-one', 'generated-two']
  const state = normalizeState({
    version: APP_STATE_VERSION,
    conversionItems: [
      { id: 'kept-id', name: '保留 ID', price: 1 },
      { name: '补全 ID', price: 2 },
      { id: '', name: '空 ID', price: 3 },
    ],
  }, { createId: () => issuedIds.shift() })

  assert.deepEqual(state.conversionItems.map((item) => item.id), [
    'kept-id',
    'generated-one',
    'generated-two',
  ])
  assert.deepEqual(issuedIds, [])
})

test('rejects missing conversion item ids when no platform id factory is supplied', () => {
  assert.throws(
    () => normalizeState({
      version: APP_STATE_VERSION,
      conversionItems: [{ name: '缺少 ID', price: 5 }],
    }),
    /requires createId/,
  )
})

test('rejects incomplete, unsupported and non-object backup roots', () => {
  for (const value of [
    {},
    { schemaVersion: APP_STATE_SCHEMA_VERSION },
    { ...DEFAULT_STATE, schemaVersion: APP_STATE_SCHEMA_VERSION + 1 },
    [],
  ]) {
    assert.equal(isImportableAppState(value), false)
    assert.throws(
      () => assertImportableAppState(value),
      (error) => error instanceof AppStateImportError
        && error.code === 'APP_STATE_IMPORT_INVALID',
    )
  }
})

test('rejects complete backups with malformed or inconsistent work settings', () => {
  const invalidSettings = [
    { startTime: 'bad' },
    { startTime: '9:00' },
    { startTime: '24:00' },
    { endTime: '18:60' },
    { endTime: '08:00', endDayOffset: 0 },
    { lunchStart: '08:00' },
    { lunchEnd: '12:00' },
    { endTime: '12:30', lunchEnd: '13:00' },
    { endDayOffset: 2 },
    { monthlySalary: Number.NaN },
    { monthlySalary: ' ' },
    { workdays: 0 },
    { payday: 32 },
    { displayBasis: 'other' },
    {
      monthlySalary: Number.MAX_VALUE,
      workdays: 1,
      startTime: '09:00',
      endTime: '09:02',
      lunchStart: '09:00',
      lunchEnd: '09:01',
    },
  ]

  for (const settingsOverride of invalidSettings) {
    const backup = createCompleteBackup({
      settings: { ...DEFAULT_STATE.settings, ...settingsOverride },
    })
    assert.equal(
      isImportableAppState(backup),
      false,
      JSON.stringify(settingsOverride),
    )
  }
})

test('repairs finite inputs whose derived rates would overflow', () => {
  const state = normalizeState({
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    settings: {
      ...DEFAULT_STATE.settings,
      monthlySalary: Number.MAX_VALUE,
      workdays: 1,
      startTime: '09:00',
      endTime: '09:02',
      lunchStart: '09:00',
      lunchEnd: '09:01',
    },
    conversionItems: [],
  })

  assert.equal(state.settings.monthlySalary, DEFAULT_STATE.settings.monthlySalary)
  assert.equal(Object.values(getRates(state.settings)).every(Number.isFinite), true)
})

test('accepts a valid overnight schedule in current and legacy backups', () => {
  const settings = {
    ...DEFAULT_STATE.settings,
    startTime: '22:00',
    endTime: '06:00',
    endDayOffset: 1,
    lunchStart: '23:30',
    lunchEnd: '00:30',
  }
  const currentBackup = createCompleteBackup({ settings })
  const { schemaVersion: _schemaVersion, ...legacyBackup } = currentBackup
  legacyBackup.version = APP_STATE_VERSION

  assert.equal(isImportableAppState(currentBackup), true)
  assert.equal(isImportableAppState(legacyBackup), true)
})

test('accepts a complete current backup and a complete legacy custom-items backup', () => {
  const currentBackup = createCompleteBackup()
  const { conversionItems: _conversionItems, ...legacyBackup } = currentBackup
  legacyBackup.customItems = [{ id: 'legacy', name: '旧项目', price: 8 }]

  for (const value of [currentBackup, legacyBackup]) {
    assert.equal(isImportableAppState(value), true)
    assert.equal(assertImportableAppState(value), value)
  }

  const migratedLegacy = normalizeState(legacyBackup)
  assert.deepEqual(migratedLegacy.conversionItems.at(-1), legacyBackup.customItems[0])
})
