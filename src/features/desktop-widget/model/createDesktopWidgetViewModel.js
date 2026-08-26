import { reconcileLeaveSession } from '../../../lib/leaveSession.js'
import { getRates, getWorkSnapshot, shouldShowWorkCountdown } from '../../../lib/time.js'

export const DESKTOP_WIDGET_PHASES = Object.freeze({
  BEFORE_WORK: 'before-work',
  WORKING: 'working',
  LUNCH: 'lunch',
  PAID_LEAVE: 'paid-leave',
  AFTER_WORK: 'after-work',
  REST_DAY: 'rest-day',
})

function getLiveLeaveSeconds(session, now) {
  const accumulatedSeconds = Math.max(0, Number(session.accumulatedSeconds) || 0)
  if (!session.running || !Number.isFinite(session.startedAt)) return accumulatedSeconds
  return accumulatedSeconds + Math.max(0, Math.floor((now.getTime() - session.startedAt) / 1000))
}

function createCompactTimer(phase, countdownSeconds, leaveSeconds) {
  if (phase === DESKTOP_WIDGET_PHASES.PAID_LEAVE) {
    return Object.freeze({ kind: 'elapsed', seconds: leaveSeconds })
  }
  if (shouldShowWorkCountdown(phase)) {
    return Object.freeze({ kind: 'countdown', seconds: countdownSeconds })
  }
  return null
}

export function createDesktopWidgetViewModel({
  appState,
  now,
  unseenReleaseCount = 0,
  preferences,
}) {
  if (!appState) throw new TypeError('desktop widget view model requires appState')
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('desktop widget view model requires a valid now')
  }

  const work = getWorkSnapshot(now, appState.settings, appState.attendance)
  const leaveSession = reconcileLeaveSession(
    appState.leaveSession,
    now,
    appState.settings,
    appState.attendance,
  )
  const leaveSeconds = getLiveLeaveSeconds(leaveSession, now)
  const rate = getRates(appState.settings)
  const phase = leaveSession.running ? DESKTOP_WIDGET_PHASES.PAID_LEAVE : work.phase
  const compactTimer = createCompactTimer(phase, work.countdownSeconds, leaveSeconds)
  const secondsUntilNextShift = Math.max(
    0,
    Math.floor((work.nextActualShiftStart.getTime() - now.getTime()) / 1000),
  )

  return Object.freeze({
    phase,
    status: Object.freeze({
      label: leaveSession.running ? '离席中' : work.status,
      detail: leaveSession.running ? '离开工位也在计价' : work.statusDetail,
    }),
    countdown: Object.freeze({
      activeSeconds: work.countdownSeconds,
      secondsUntilNextShift,
      nextActualShiftStart: work.nextActualShiftStart.getTime(),
    }),
    timer: compactTimer,
    shift: Object.freeze({
      startTime: appState.settings.startTime,
      endTime: appState.settings.endTime,
      endDayOffset: Number(appState.settings.endDayOffset) === 1 ? 1 : 0,
      workday: work.workday,
      paidSeconds: work.paidSeconds,
      totalPaidSeconds: work.totalPaidSeconds,
      progress: work.progress,
    }),
    income: Object.freeze({
      earned: work.earnings,
      perSecond: rate.second,
    }),
    leave: Object.freeze({
      running: leaveSession.running,
      elapsedSeconds: leaveSeconds,
      earnings: leaveSeconds * rate.second,
      canStart: !leaveSession.running,
      canStop: leaveSession.running,
    }),
    release: Object.freeze({
      unseenCount: Math.max(0, Math.floor(Number(unseenReleaseCount) || 0)),
    }),
    window: Object.freeze({
      locked: Boolean(preferences?.locked),
      alwaysOnTop: preferences?.alwaysOnTop !== false,
      scale: Number(preferences?.scale) || 1,
    }),
  })
}
