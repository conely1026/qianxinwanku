import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_STATE } from '../core/state/appState.js'
import {
  addAppConversionItem,
  applyAppSettings,
  deleteAppConversionItem,
  reconcileAppLeaveSession,
  setAppLastView,
  toggleAppAttendanceDay,
  toggleAppLeaveSession,
  updateAppConversionItem,
  updateAppHeadphone,
} from './appStateActions.js'

function createState(overrides = {}) {
  return {
    ...DEFAULT_STATE,
    settings: { ...DEFAULT_STATE.settings },
    attendance: {},
    conversionItems: [...DEFAULT_STATE.conversionItems],
    leaveSession: { ...DEFAULT_STATE.leaveSession },
    headphone: { ...DEFAULT_STATE.headphone },
    ...overrides,
  }
}

function timestamp(year, month, day, hours, minutes = 0, seconds = 0) {
  return new Date(year, month - 1, day, hours, minutes, seconds).getTime()
}

test('leave actions reconcile the shift period and use the supplied action time', () => {
  const beforeStart = new Date(2026, 7, 26, 8, 0, 0)
  const started = toggleAppLeaveSession(createState(), beforeStart)

  assert.equal(started.leaveSession.running, true)
  assert.equal(started.leaveSession.startedAt, beforeStart.getTime())

  const stoppedAt = new Date(2026, 7, 26, 8, 1, 5)
  const stopped = toggleAppLeaveSession(started, stoppedAt)
  assert.deepEqual(stopped.leaveSession, {
    running: false,
    startedAt: null,
    accumulatedSeconds: 65,
    periodStartedAt: timestamp(2026, 8, 25, 9),
  })

  const paused = reconcileAppLeaveSession(stopped, new Date(2026, 7, 26, 8, 1, 6))
  const nextShift = new Date(2026, 7, 27, 9, 0, 0)
  const reconciled = reconcileAppLeaveSession(paused, nextShift)
  assert.deepEqual(reconciled.leaveSession, {
    running: false,
    startedAt: null,
    accumulatedSeconds: 0,
    periodStartedAt: nextShift.getTime(),
  })
})

test('app reconciliation uses attendance overrides for the next actual shift', () => {
  const current = createState({
    attendance: { '2026-08-31': 'rest', '2026-09-05': 'work' },
    leaveSession: {
      running: false,
      startedAt: null,
      accumulatedSeconds: 420,
      periodStartedAt: timestamp(2026, 8, 28, 9),
    },
  })

  assert.equal(
    reconcileAppLeaveSession(current, new Date(2026, 7, 31, 12)),
    current,
  )

  const nextWeekday = reconcileAppLeaveSession(current, new Date(2026, 8, 1, 9))
  assert.equal(nextWeekday.leaveSession.accumulatedSeconds, 0)
  assert.equal(nextWeekday.leaveSession.periodStartedAt, timestamp(2026, 9, 1, 9))

  const beforeManualWeekend = createState({
    attendance: current.attendance,
    leaveSession: {
      ...current.leaveSession,
      periodStartedAt: timestamp(2026, 9, 4, 9),
    },
  })
  const manualWeekend = reconcileAppLeaveSession(
    beforeManualWeekend,
    new Date(2026, 8, 5, 9),
  )
  assert.equal(manualWeekend.leaveSession.accumulatedSeconds, 0)
  assert.equal(manualWeekend.leaveSession.periodStartedAt, timestamp(2026, 9, 5, 9))
})

test('settings, navigation, attendance and headphone actions preserve unrelated state', () => {
  const current = createState()
  const settings = { ...current.settings, startTime: '10:00' }
  const actionTime = new Date(2026, 7, 26, 10, 0, 0)
  const withSettings = applyAppSettings(current, settings, actionTime)
  const withView = setAppLastView(withSettings, 'calendar')
  const withAttendance = toggleAppAttendanceDay(withView, new Date(2026, 7, 29))
  const withHeadphone = updateAppHeadphone(withAttendance, 'hours', 120)

  assert.equal(withHeadphone.settings, settings)
  assert.equal(withHeadphone.lastView, 'calendar')
  assert.equal(withHeadphone.attendance['2026-08-29'], 'work')
  assert.equal(withHeadphone.headphone.hours, 120)
  assert.equal(withHeadphone.headphone.price, current.headphone.price)
  assert.equal(current.attendance['2026-08-29'], undefined)
})

test('conversion actions compose without mutating the original list', () => {
  const current = createState({ conversionItems: [{ id: 'one', name: '旧名称', price: 10 }] })
  const added = addAppConversionItem(current, { id: 'two', name: '新增', price: 20 })
  const updated = updateAppConversionItem(added, { id: 'one', name: '新名称', price: 15 })
  const deleted = deleteAppConversionItem(updated, 'two')

  assert.deepEqual(current.conversionItems, [{ id: 'one', name: '旧名称', price: 10 }])
  assert.deepEqual(deleted.conversionItems, [{ id: 'one', name: '新名称', price: 15 }])
})
