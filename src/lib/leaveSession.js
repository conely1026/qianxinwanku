import { timeOnDate } from './time.js'

export function getLeavePeriodStart(now, settings) {
  const periodStart = timeOnDate(now, settings.startTime)
  if (now < periodStart) periodStart.setDate(periodStart.getDate() - 1)
  return periodStart
}

export function reconcileLeaveSession(session, now, settings) {
  const periodStartedAt = getLeavePeriodStart(now, settings).getTime()
  const storedPeriodStartedAt = Number(session.periodStartedAt)

  if (!Number.isFinite(storedPeriodStartedAt)) {
    return { ...session, periodStartedAt }
  }

  if (storedPeriodStartedAt >= periodStartedAt) return session

  return {
    running: false,
    startedAt: null,
    accumulatedSeconds: 0,
    periodStartedAt,
  }
}

export function rebaseLeaveSessionPeriod(session, now, settings) {
  const periodStartedAt = getLeavePeriodStart(now, settings).getTime()
  if (Number(session.periodStartedAt) === periodStartedAt) return session
  return { ...session, periodStartedAt }
}
