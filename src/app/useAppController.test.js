import test from 'node:test'
import assert from 'node:assert/strict'
import { APP_STATE_VERSION, DEFAULT_STATE } from '../core/state/appState.js'
import { applyImportedAppData } from './useAppController.js'

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

test('invalid backup schema returns false without replacing data or reporting success', () => {
  const events = []

  for (const value of [
    {},
    { version: APP_STATE_VERSION },
    { ...createCompleteBackup(), version: APP_STATE_VERSION + 1 },
    [],
  ]) {
    assert.equal(applyImportedAppData(value, {
      replaceData: () => events.push('replace'),
      onImported: () => events.push('imported'),
    }), false)
  }

  assert.deepEqual(events, [])
})

test('complete current and legacy backups replace data and report success', () => {
  const currentBackup = createCompleteBackup()
  const { conversionItems: _conversionItems, ...legacyBackup } = currentBackup
  legacyBackup.customItems = []
  const replaced = []
  let importedCount = 0

  for (const value of [currentBackup, legacyBackup]) {
    assert.equal(applyImportedAppData(value, {
      replaceData: (data) => replaced.push(data),
      onImported: () => { importedCount += 1 },
    }), true)
  }

  assert.deepEqual(replaced, [currentBackup, legacyBackup])
  assert.equal(importedCount, 2)
})

test('unexpected replace failures propagate without reporting import success', () => {
  let imported = false

  assert.throws(
    () => applyImportedAppData(createCompleteBackup(), {
      replaceData() {
        throw new Error('replace failed')
      },
      onImported() {
        imported = true
      },
    }),
    /replace failed/,
  )
  assert.equal(imported, false)
})
