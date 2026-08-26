import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_STATE } from '../../../core/state/appState.js'
import {
  createDesktopWidgetViewModel,
  DESKTOP_WIDGET_PHASES,
} from './createDesktopWidgetViewModel.js'

function createState(overrides = {}) {
  return {
    ...DEFAULT_STATE,
    settings: {
      ...DEFAULT_STATE.settings,
      startTime: '09:00',
      endTime: '18:00',
      endDayOffset: 0,
      lunchStart: '12:00',
      lunchEnd: '13:00',
    },
    attendance: {},
    leaveSession: { ...DEFAULT_STATE.leaveSession },
    ...overrides,
  }
}

test('maps the shared work snapshot into a skin-neutral desktop model', () => {
  const now = new Date(2026, 7, 31, 10, 30, 0)
  const model = createDesktopWidgetViewModel({
    appState: createState(),
    now,
    unseenReleaseCount: 3,
    preferences: { locked: true, alwaysOnTop: true, scale: 1.25 },
  })

  assert.equal(model.phase, DESKTOP_WIDGET_PHASES.WORKING)
  assert.equal(model.status.label, '工作计价中')
  assert.equal(model.release.unseenCount, 3)
  assert.deepEqual(model.window, { locked: true, alwaysOnTop: true, scale: 1.25 })
  assert.equal(model.shift.workday, true)
  assert.ok(model.income.earned > 0)
  assert.deepEqual(model.timer, {
    kind: 'countdown',
    seconds: model.countdown.activeSeconds,
  })
})

test('paid leave is a presentation priority without changing the underlying work model', () => {
  const now = new Date(2026, 7, 31, 10, 30, 30)
  const startedAt = new Date(2026, 7, 31, 10, 20, 0).getTime()
  const model = createDesktopWidgetViewModel({
    appState: createState({
      leaveSession: {
        running: true,
        startedAt,
        accumulatedSeconds: 120,
        periodStartedAt: new Date(2026, 7, 31, 9, 0, 0).getTime(),
      },
    }),
    now,
  })

  assert.equal(model.phase, DESKTOP_WIDGET_PHASES.PAID_LEAVE)
  assert.equal(model.status.label, '离席中')
  assert.equal(model.leave.running, true)
  assert.equal(model.leave.elapsedSeconds, 750)
  assert.equal(model.leave.canStart, false)
  assert.equal(model.leave.canStop, true)
  assert.equal(model.shift.workday, true)
  assert.deepEqual(model.timer, { kind: 'elapsed', seconds: 750 })
})

test('compact timer appears only while working, at lunch or actively away', () => {
  const appState = createState()
  const beforeWork = createDesktopWidgetViewModel({
    appState,
    now: new Date(2026, 7, 31, 8, 30, 0),
  })
  const lunch = createDesktopWidgetViewModel({
    appState,
    now: new Date(2026, 7, 31, 12, 30, 0),
  })
  const afterWork = createDesktopWidgetViewModel({
    appState,
    now: new Date(2026, 7, 31, 18, 30, 0),
  })
  const restDay = createDesktopWidgetViewModel({
    appState,
    now: new Date(2026, 7, 29, 10, 0, 0),
  })

  assert.equal(beforeWork.phase, DESKTOP_WIDGET_PHASES.BEFORE_WORK)
  assert.equal(beforeWork.timer, null)
  assert.equal(lunch.phase, DESKTOP_WIDGET_PHASES.LUNCH)
  assert.deepEqual(lunch.timer, {
    kind: 'countdown',
    seconds: lunch.countdown.activeSeconds,
  })
  assert.equal(afterWork.phase, DESKTOP_WIDGET_PHASES.AFTER_WORK)
  assert.equal(afterWork.timer, null)
  assert.equal(restDay.phase, DESKTOP_WIDGET_PHASES.REST_DAY)
  assert.equal(restDay.timer, null)
})

test('rest and overridden workdays expose the next actual shift without parsing copy', () => {
  const now = new Date(2026, 7, 29, 10, 0, 0)
  const rested = createDesktopWidgetViewModel({ appState: createState(), now })
  const worked = createDesktopWidgetViewModel({
    appState: createState({ attendance: { '2026-08-29': 'work' } }),
    now,
  })

  assert.equal(rested.phase, DESKTOP_WIDGET_PHASES.REST_DAY)
  assert.equal(worked.phase, DESKTOP_WIDGET_PHASES.WORKING)
  assert.ok(rested.countdown.secondsUntilNextShift > 0)
  assert.equal(
    rested.countdown.nextActualShiftStart,
    new Date(2026, 7, 31, 9, 0, 0).getTime(),
  )
})
