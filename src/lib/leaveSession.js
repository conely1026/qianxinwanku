import { isWorkday, timeOnDate } from './time.js'

export function getLeavePeriodStart(now, settings, attendance = {}) {
  const periodDate = new Date(now)
  const todayStart = timeOnDate(periodDate, settings.startTime)
  if (now < todayStart) periodDate.setDate(periodDate.getDate() - 1)

  while (!isWorkday(periodDate, attendance)) {
    periodDate.setDate(periodDate.getDate() - 1)
  }

  return timeOnDate(periodDate, settings.startTime)
}

export function reconcileLeaveSession(session, now, settings, attendance = {}) {
  const periodStartedAt = getLeavePeriodStart(now, settings, attendance).getTime()
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

export function rebaseLeaveSessionPeriod(session, now, settings, attendance = {}) {
  const periodStartedAt = getLeavePeriodStart(now, settings, attendance).getTime()
  if (Number(session.periodStartedAt) === periodStartedAt) return session
  return { ...session, periodStartedAt }
}
