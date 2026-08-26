import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { Icon } from './components/Icons'
import { ReleaseNotesModal } from './components/ReleaseNotesModal'
import { SettingsModal } from './components/SettingsModal'
import { DEFAULT_STATE, STORAGE_KEY, usePersistentState } from './hooks/usePersistentState'
import { appendConversionItem, removeConversionItem, replaceConversionItem } from './lib/conversionItems'
import { rebaseLeaveSessionPeriod, reconcileLeaveSession } from './lib/leaveSession'
import { CURRENT_RELEASE, getUnseenReleases, RELEASE_SEEN_STORAGE_KEY } from './lib/releaseNotes'
import { dateKey, isDefaultWorkday } from './lib/time'
import { CalendarView } from './views/CalendarView'
import { ConvertView } from './views/ConvertView'
import { ProfileView } from './views/ProfileView'
import { TodayView } from './views/TodayView'

const VIEW_TITLES = {
  today: '今日',
  convert: '换算',
  calendar: '日历',
  profile: '我的',
}

function readUnseenReleases() {
  try {
    const lastSeenReleaseId = window.localStorage.getItem(RELEASE_SEEN_STORAGE_KEY)
    const hasExistingAppData = window.localStorage.getItem(STORAGE_KEY) !== null
    return getUnseenReleases(lastSeenReleaseId, { includeAllWhenUnseen: hasExistingAppData })
  } catch {
    return [CURRENT_RELEASE]
  }
}

export function App() {
  const [data, setData, replaceData] = usePersistentState()
  const [view, setView] = useState(data.lastView || 'today')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [calendarCursor, setCalendarCursor] = useState(() => new Date())
  const [toast, setToast] = useState('')
  const [unseenReleases, setUnseenReleases] = useState(readUnseenReleases)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setData((current) => {
      const leaveSession = reconcileLeaveSession(current.leaveSession, now, current.settings)
      return leaveSession === current.leaveSession ? current : { ...current, leaveSession }
    })
  }, [now, setData])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    document.title = `${VIEW_TITLES[view]} · 千薪万苦`
  }, [view])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const navigate = useCallback((nextView) => {
    setView(nextView)
    setData((current) => ({ ...current, lastView: nextView }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setData])

  const toggleLeave = useCallback(() => {
    setData((current) => {
      const actionTime = new Date()
      const session = reconcileLeaveSession(current.leaveSession, actionTime, current.settings)
      if (session.running) {
        const live = Math.max(0, Math.floor((actionTime.getTime() - session.startedAt) / 1000))
        return {
          ...current,
          leaveSession: {
            running: false,
            startedAt: null,
            accumulatedSeconds: Number(session.accumulatedSeconds || 0) + live,
          },
        }
      }
      return {
        ...current,
        leaveSession: { ...session, running: true, startedAt: actionTime.getTime() },
      }
    })
  }, [setData])

  const saveSettings = useCallback((settings) => {
    setData((current) => ({
      ...current,
      settings,
      leaveSession: rebaseLeaveSessionPeriod(current.leaveSession, new Date(), settings),
    }))
    setSettingsOpen(false)
    setToast('参数已保存在本机')
  }, [setData])

  const toggleDay = useCallback((date) => {
    const key = dateKey(date)
    setData((current) => {
      const attendance = { ...current.attendance }
      const defaultState = isDefaultWorkday(date) ? 'work' : 'rest'
      if (!attendance[key]) attendance[key] = defaultState === 'work' ? 'rest' : 'work'
      else delete attendance[key]
      return { ...current, attendance }
    })
  }, [setData])

  const addConversionItem = useCallback((item) => {
    setData((current) => ({
      ...current,
      conversionItems: appendConversionItem(current.conversionItems, item),
    }))
  }, [setData])

  const updateConversionItem = useCallback((item) => {
    setData((current) => ({
      ...current,
      conversionItems: replaceConversionItem(current.conversionItems, item),
    }))
  }, [setData])

  const deleteConversionItem = useCallback((id) => {
    setData((current) => ({
      ...current,
      conversionItems: removeConversionItem(current.conversionItems, id),
    }))
  }, [setData])

  const dismissReleaseNotes = useCallback(() => {
    try {
      window.localStorage.setItem(RELEASE_SEEN_STORAGE_KEY, CURRENT_RELEASE.id)
    } catch {
      // The announcement can still be dismissed for this session when storage is unavailable.
    }
    setUnseenReleases([])
  }, [])

  function resetData() {
    if (!window.confirm('确定清空这台设备上的全部参数和统计吗？此操作无法撤销。')) return
    replaceData(DEFAULT_STATE)
    setView('today')
    setToast('本机数据已清空')
  }

  const views = {
    today: <TodayView data={data} now={now} onLeaveToggle={toggleLeave} onNavigate={navigate} />,
    convert: (
      <ConvertView
        data={data}
        onAddItem={addConversionItem}
        onUpdateItem={updateConversionItem}
        onDeleteItem={deleteConversionItem}
      />
    ),
    calendar: (
      <CalendarView
        data={data}
        cursor={calendarCursor}
        onCursorChange={setCalendarCursor}
        onToggleDay={toggleDay}
      />
    ),
    profile: (
      <ProfileView
        data={data}
        now={now}
        onLeaveToggle={toggleLeave}
        onHeadphoneChange={(key, value) => setData((current) => ({ ...current, headphone: { ...current.headphone, [key]: value } }))}
        onImport={(nextData) => { replaceData(nextData); setToast('备份已导入本机') }}
        onReset={resetData}
      />
    ),
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => navigate('today')} aria-label="千薪万苦首页">
          <span className="brand-mark">¥</span>
          <span>
            <strong>千薪万苦</strong>
            <small>SALARY IN PROGRESS</small>
          </span>
        </button>
        <div className="header-actions">
          <span className="local-status"><i />本机保存</span>
          <button className="icon-button" type="button" aria-label="打开工作参数" onClick={() => setSettingsOpen(true)}>
            <Icon name="sliders" size={21} />
          </button>
        </div>
      </header>

      <main className="app-main" key={view}>{views[view]}</main>
      <BottomNav active={view} onChange={navigate} />

      <SettingsModal
        open={settingsOpen}
        settings={data.settings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
      />

      <ReleaseNotesModal
        open={unseenReleases.length > 0}
        releases={unseenReleases}
        onClose={dismissReleaseNotes}
      />

      {toast ? <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div> : null}
    </div>
  )
}
