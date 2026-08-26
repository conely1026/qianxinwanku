import test from 'node:test'
import assert from 'node:assert/strict'
import { getWorkSnapshot, isValidSchedule, paidMinutesPerDay } from './time.js'

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

  assert.equal(snapshot.status, '工作计价中')
  assert.equal(snapshot.countdownSeconds, 30 * 60)
  assert.equal(snapshot.paidSeconds, 12.5 * 60 * 60)
  assert.equal(snapshot.totalPaidSeconds, 13 * 60 * 60)
})
