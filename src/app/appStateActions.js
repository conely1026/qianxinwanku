import { appendConversionItem, removeConversionItem, replaceConversionItem } from '../lib/conversionItems.js'
import { rebaseLeaveSessionPeriod, reconcileLeaveSession } from '../lib/leaveSession.js'
import { dateKey, isDefaultWorkday } from '../lib/time.js'

export function reconcileAppLeaveSession(current, now) {
  const leaveSession = reconcileLeaveSession(
    current.leaveSession,
    now,
    current.settings,
    current.attendance,
  )
  return leaveSession === current.leaveSession ? current : { ...current, leaveSession }
}

export function toggleAppLeaveSession(current, actionTime) {
  const session = reconcileLeaveSession(
    current.leaveSession,
    actionTime,
    current.settings,
    current.attendance,
  )
  if (session.running) {
    const liveSeconds = Math.max(
      0,
      Math.floor((actionTime.getTime() - session.startedAt) / 1000),
    )
    return {
      ...current,
      leaveSession: {
        ...session,
        running: false,
        startedAt: null,
        accumulatedSeconds: Number(session.accumulatedSeconds || 0) + liveSeconds,
      },
    }
  }

  return {
    ...current,
    leaveSession: { ...session, running: true, startedAt: actionTime.getTime() },
  }
}

export function applyAppSettings(current, settings, actionTime) {
  return {
    ...current,
    settings,
    leaveSession: rebaseLeaveSessionPeriod(
      current.leaveSession,
      actionTime,
      settings,
      current.attendance,
    ),
  }
}

export function toggleAppAttendanceDay(current, date) {
  const key = dateKey(date)
  const attendance = { ...current.attendance }
  const defaultState = isDefaultWorkday(date) ? 'work' : 'rest'
  if (!attendance[key]) attendance[key] = defaultState === 'work' ? 'rest' : 'work'
  else delete attendance[key]
  return { ...current, attendance }
}

export function addAppConversionItem(current, item) {
  return {
    ...current,
    conversionItems: appendConversionItem(current.conversionItems, item),
  }
}

export function updateAppConversionItem(current, item) {
  return {
    ...current,
    conversionItems: replaceConversionItem(current.conversionItems, item),
  }
}

export function deleteAppConversionItem(current, id) {
  return {
    ...current,
    conversionItems: removeConversionItem(current.conversionItems, id),
  }
}

export function updateAppHeadphone(current, key, value) {
  return {
    ...current,
    headphone: { ...current.headphone, [key]: value },
  }
}

export function setAppLastView(current, view) {
  return { ...current, lastView: view }
}
