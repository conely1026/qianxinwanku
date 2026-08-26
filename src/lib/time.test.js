import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getNextActualShiftStart,
  getWorkSnapshot,
  isValidSchedule,
  paidMinutesPerDay,
  shouldShowWorkCountdown,
  WORK_PHASES,
} from './time.js'

const daytimeSettings = {
  monthlySalary: 3000,
  workdays: 22,
  startTime: '09:00',
  endTime: '18:00',
  endDayOffset: 0,
  lunchStart: '12:00',
  lunchEnd: '13:00',
  displayBasis: 'gross',
}

const overnightSettings = {
  monthlySalary: 3000,
  workdays: 22,
  startTime: '10:00',
  endTime: '01:00',
  endDayOffset: 1,
  lunchStart: '12:00',
  lunchEnd: '14:00',
  displayBasis: 'gross',
}

test('accepts midnight as next-day end time and calculates paid minutes', () => {
  const settings = { ...overnightSettings, endTime: '00:00' }

  assert.equal(isValidSchedule(settings), true)
  assert.equal(paidMinutesPerDay(settings), 12 * 60)
})

test('rejects an earlier end time when it is still marked as the same day', () => {
  assert.equal(isValidSchedule({ ...overnightSettings, endDayOffset: 0 }), false)
})

test('keeps the previous workday active after midnight', () => {
  const now = new Date(2026, 7, 27, 0, 30, 0)
  const snapshot = getWorkSnapshot(now, overnightSettings)

  assert.equal(snapshot.phase, WORK_PHASES.WORKING)
  assert.equal(snapshot.status, '工作计价中')
  assert.equal(snapshot.countdownSeconds, 30 * 60)
  assert.equal(snapshot.paidSeconds, 12.5 * 60 * 60)
  assert.equal(snapshot.totalPaidSeconds, 13 * 60 * 60)
  assert.deepEqual(snapshot.nextActualShiftStart, new Date(2026, 7, 27, 10, 0, 0))
})

test('returns stable machine phases without removing the existing Chinese status fields', () => {
  const cases = [
    [new Date(2026, 7, 31, 8, 59, 59), WORK_PHASES.BEFORE_WORK, '等待开工'],
    [new Date(2026, 7, 31, 10, 0, 0), WORK_PHASES.WORKING, '工作计价中'],
    [new Date(2026, 7, 31, 12, 30, 0), WORK_PHASES.LUNCH, '午休进行中'],
    [new Date(2026, 7, 31, 18, 0, 0), WORK_PHASES.AFTER_WORK, '今日已下班'],
    [new Date(2026, 7, 30, 10, 0, 0), WORK_PHASES.REST_DAY, '今日休息'],
  ]

  for (const [now, phase, status] of cases) {
    const snapshot = getWorkSnapshot(now, daytimeSettings)
    assert.equal(snapshot.phase, phase)
    assert.equal(snapshot.status, status)
    assert.equal(typeof snapshot.statusDetail, 'string')
  }
})

test('shows a work countdown only for active work and lunch phases', () => {
  assert.equal(shouldShowWorkCountdown(WORK_PHASES.BEFORE_WORK), false)
  assert.equal(shouldShowWorkCountdown(WORK_PHASES.WORKING), true)
  assert.equal(shouldShowWorkCountdown(WORK_PHASES.LUNCH), true)
  assert.equal(shouldShowWorkCountdown(WORK_PHASES.AFTER_WORK), false)
  assert.equal(shouldShowWorkCountdown(WORK_PHASES.REST_DAY), false)

  const lunch = getWorkSnapshot(new Date(2026, 7, 31, 12, 30, 0), daytimeSettings)
  assert.equal(lunch.statusDetail, '距离午休结束')
  assert.equal(lunch.countdownSeconds, 30 * 60)

  const beforeWork = getWorkSnapshot(new Date(2026, 7, 31, 8, 30, 0), daytimeSettings)
  assert.equal(beforeWork.statusDetail, '还没到上班时间')
})

test('finds the next actual shift after rest days and attendance overrides', () => {
  const attendance = {
    '2026-08-29': 'work',
    '2026-08-31': 'rest',
  }

  assert.deepEqual(
    getNextActualShiftStart(new Date(2026, 7, 29, 8, 0, 0), daytimeSettings, attendance),
    new Date(2026, 7, 29, 9, 0, 0),
  )
  assert.deepEqual(
    getNextActualShiftStart(new Date(2026, 7, 29, 9, 0, 0), daytimeSettings, attendance),
    new Date(2026, 8, 1, 9, 0, 0),
  )
  assert.deepEqual(
    getNextActualShiftStart(new Date(2026, 7, 30, 12, 0, 0), daytimeSettings, attendance),
    new Date(2026, 8, 1, 9, 0, 0),
  )

  assert.equal(
    getWorkSnapshot(new Date(2026, 7, 29, 10, 0, 0), daytimeSettings, attendance).phase,
    WORK_PHASES.WORKING,
  )
  assert.equal(
    getWorkSnapshot(new Date(2026, 7, 31, 10, 0, 0), daytimeSettings, attendance).phase,
    WORK_PHASES.REST_DAY,
  )
})

test('does not treat an early morning as an overnight shift when the previous day was rested', () => {
  const attendance = { '2026-08-26': 'rest' }
  const now = new Date(2026, 7, 27, 0, 30, 0)
  const snapshot = getWorkSnapshot(now, overnightSettings, attendance)

  assert.equal(snapshot.phase, WORK_PHASES.BEFORE_WORK)
  assert.equal(snapshot.status, '等待开工')
  assert.equal(snapshot.paidSeconds, 0)
  assert.deepEqual(snapshot.nextActualShiftStart, new Date(2026, 7, 27, 10, 0, 0))
})

test('keeps a manually worked weekend shift active across midnight', () => {
  const attendance = { '2026-08-29': 'work' }
  const snapshot = getWorkSnapshot(
    new Date(2026, 7, 30, 0, 30, 0),
    overnightSettings,
    attendance,
  )

  assert.equal(snapshot.phase, WORK_PHASES.WORKING)
  assert.equal(snapshot.workday, true)
  assert.deepEqual(snapshot.nextActualShiftStart, new Date(2026, 7, 31, 10, 0, 0))
})

test('moves from an overnight shift to the current day before-work phase exactly at shift end', () => {
  const snapshot = getWorkSnapshot(
    new Date(2026, 7, 27, 1, 0, 0),
    overnightSettings,
  )

  assert.equal(snapshot.phase, WORK_PHASES.BEFORE_WORK)
  assert.deepEqual(snapshot.nextActualShiftStart, new Date(2026, 7, 27, 10, 0, 0))
})
