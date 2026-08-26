import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AppStateImportError,
  assertImportableAppState,
  DEFAULT_STATE,
} from '../core/state/appState.js'
import { usePersistentState } from '../hooks/usePersistentState.js'
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
import {
  acknowledgeAllReleaseNotes,
  createReleaseNotesSession,
  dismissReleaseNotesForSession,
  isReleaseNotesOpen,
  reopenReleaseNotesForSession,
} from './releaseNotesSession.js'

export function applyImportedAppData(nextData, { replaceData, onImported }) {
  try {
    assertImportableAppState(nextData)
  } catch (error) {
    if (error instanceof AppStateImportError) return false
    throw error
  }

  replaceData(nextData)
  onImported()
  return true
}

export function useAppController({ stateStorage, releaseService, clock, idFactory }) {
  if (!stateStorage) throw new TypeError('useAppController requires stateStorage')
  if (!releaseService) throw new TypeError('useAppController requires releaseService')
  if (!clock) throw new TypeError('useAppController requires clock')
  if (typeof idFactory?.createId !== 'function') {
    throw new TypeError('useAppController requires idFactory.createId')
  }

  const [data, setData, replaceData] = usePersistentState(stateStorage)
  const [view, setView] = useState(data.lastView || 'today')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [now, setNow] = useState(() => clock.now())
  const [calendarCursor, setCalendarCursor] = useState(() => clock.now())
  const [toast, setToast] = useState('')
  const [releaseNotesSession, setReleaseNotesSession] = useState(
    () => createReleaseNotesSession(releaseService.readUnseenReleases()),
  )
  const unseenReleases = releaseNotesSession.unseenReleases
  const releaseNotesOpen = isReleaseNotesOpen(releaseNotesSession)

  useEffect(() => (
    clock.setInterval(() => setNow(clock.now()), 1000)
  ), [clock])

  useEffect(() => {
    setData((current) => reconcileAppLeaveSession(current, now))
  }, [now, setData])

  useEffect(() => {
    if (!toast) return undefined
    return clock.setTimeout(() => setToast(''), 2400)
  }, [clock, toast])

  const navigate = useCallback((nextView) => {
    setView(nextView)
    setData((current) => setAppLastView(current, nextView))
  }, [setData])

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const toggleLeave = useCallback(() => {
    setData((current) => toggleAppLeaveSession(current, clock.now()))
  }, [clock, setData])

  const saveSettings = useCallback((settings) => {
    setData((current) => applyAppSettings(current, settings, clock.now()))
    setSettingsOpen(false)
    setToast('参数已保存在本机')
  }, [clock, setData])

  const toggleDay = useCallback((date) => {
    setData((current) => toggleAppAttendanceDay(current, date))
  }, [setData])

  const addConversionItem = useCallback((item) => {
    setData((current) => addAppConversionItem(current, {
      id: idFactory.createId(),
      ...item,
    }))
  }, [idFactory, setData])

  const updateConversionItem = useCallback((item) => {
    setData((current) => updateAppConversionItem(current, item))
  }, [setData])

  const deleteConversionItem = useCallback((id) => {
    setData((current) => deleteAppConversionItem(current, id))
  }, [setData])

  const dismissReleaseNotes = useCallback(() => {
    setReleaseNotesSession(dismissReleaseNotesForSession)
  }, [])

  const openReleaseNotes = useCallback(() => {
    setReleaseNotesSession(reopenReleaseNotesForSession)
  }, [])

  const acknowledgeReleaseNotes = useCallback(() => {
    releaseService.markCurrentReleaseSeen()
    setReleaseNotesSession(acknowledgeAllReleaseNotes)
  }, [releaseService])

  const resetData = useCallback(() => {
    replaceData(DEFAULT_STATE)
    setView('today')
    setToast('本机数据已清空')
  }, [replaceData])

  const importData = useCallback((nextData) => {
    return applyImportedAppData(nextData, {
      replaceData,
      onImported: () => setToast('备份已导入本机'),
    })
  }, [replaceData])

  const updateHeadphone = useCallback((key, value) => {
    setData((current) => updateAppHeadphone(current, key, value))
  }, [setData])

  const actions = useMemo(() => ({
    navigate,
    openSettings,
    closeSettings,
    saveSettings,
    setCalendarCursor,
    toggleDay,
    toggleLeave,
    addConversionItem,
    updateConversionItem,
    deleteConversionItem,
    dismissReleaseNotes,
    openReleaseNotes,
    acknowledgeReleaseNotes,
    resetData,
    importData,
    updateHeadphone,
  }), [
    navigate,
    openSettings,
    closeSettings,
    saveSettings,
    setCalendarCursor,
    toggleDay,
    toggleLeave,
    addConversionItem,
    updateConversionItem,
    deleteConversionItem,
    dismissReleaseNotes,
    openReleaseNotes,
    acknowledgeReleaseNotes,
    resetData,
    importData,
    updateHeadphone,
  ])

  return {
    data,
    view,
    settingsOpen,
    now,
    calendarCursor,
    toast,
    unseenReleases,
    releaseNotesOpen,
    actions,
  }
}
