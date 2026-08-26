import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getLeavePeriodStart,
  reconcileLeaveSession,
  rebaseLeaveSessionPeriod,
} from './leaveSession.js'

const settings = {
  startTime: '10:00',
  endTime: '01:00',
  endDayOffset: 1,
  lunchStart: '12:00',
  lunchEnd: '14:00',
}

function timestamp(year, month, day, hours, minutes = 0, seconds = 0) {
  return new Date(year, month - 1, day, hours, minutes, seconds).getTime()
}

test('keeps the same leave period through midnight until the next shift starts', () => {
  const afterMidnight = new Date(2026, 7, 27, 0, 30)

  assert.equal(
    getLeavePeriodStart(afterMidnight, settings).getTime(),
    timestamp(2026, 8, 26, 10),
  )
})

test('resets a paused leave session exactly at the next shift start', () => {
  const previousPeriod = timestamp(2026, 8, 26, 10)
  const session = {
    running: false,
    startedAt: null,
    accumulatedSeconds: 900,
    periodStartedAt: previousPeriod,
  }

  assert.equal(
    reconcileLeaveSession(session, new Date(2026, 7, 27, 9, 59, 59), settings),
    session,
  )
  assert.deepEqual(
    reconcileLeaveSession(session, new Date(2026, 7, 27, 10, 0, 0), settings),
    {
      running: false,
      startedAt: null,
      accumulatedSeconds: 0,
      periodStartedAt: timestamp(2026, 8, 27, 10),
    },
  )
})

test('stops a running timer when the next shift resets it', () => {
  const session = {
    running: true,
    startedAt: timestamp(2026, 8, 26, 23),
    accumulatedSeconds: 300,
    periodStartedAt: timestamp(2026, 8, 26, 10),
  }

  assert.deepEqual(
    reconcileLeaveSession(session, new Date(2026, 7, 27, 10, 5), settings),
    {
      running: false,
      startedAt: null,
      accumulatedSeconds: 0,
      periodStartedAt: timestamp(2026, 8, 27, 10),
    },
  )
})

test('preserves legacy totals until the following shift start', () => {
  const legacySession = {
    running: false,
    startedAt: null,
    accumulatedSeconds: 600,
  }

  assert.deepEqual(
    reconcileLeaveSession(legacySession, new Date(2026, 7, 27, 15), settings),
    {
      ...legacySession,
      periodStartedAt: timestamp(2026, 8, 27, 10),
    },
  )
})

test('rebases the period when work settings change without clearing the total', () => {
  const session = {
    running: false,
    startedAt: null,
    accumulatedSeconds: 600,
    periodStartedAt: timestamp(2026, 8, 27, 9),
  }

  assert.deepEqual(
    rebaseLeaveSessionPeriod(session, new Date(2026, 7, 27, 15), settings),
    {
      ...session,
      periodStartedAt: timestamp(2026, 8, 27, 10),
    },
  )
})
