import { useCallback } from 'react'
import { useAppController } from './app/useAppController.js'
import { BottomNav } from './components/BottomNav'
import { Icon } from './components/Icons'
import { ReleaseNotesModal } from './components/ReleaseNotesModal'
import { SettingsModal } from './components/SettingsModal'
import {
  alertInvalidWebBackup,
  confirmWebDataReset,
  importWebBackup,
  scrollWebToTop,
  WEB_RELEASE_STORAGE_NOTE,
  WEB_STORAGE_DESCRIPTION,
} from './platform/web/webAppActions.js'
import { WebBackupImportAction } from './platform/web/WebBackupImportAction.jsx'
import { webBackupAdapter } from './platform/web/webBackup.js'
import { webClock } from './platform/web/webClock.js'
import { useWebAppEffects } from './platform/web/useWebAppEffects.js'
import { webReleaseService } from './platform/web/webReleaseService.js'
import { webIdFactory, webStateStorage } from './platform/web/webStateStorage.js'
import { CalendarView } from './views/CalendarView'
import { ConvertView } from './views/ConvertView'
import { ProfileView } from './views/ProfileView'
import { TodayView } from './views/TodayView'

export function App() {
  const controller = useAppController({
    stateStorage: webStateStorage,
    releaseService: webReleaseService,
    clock: webClock,
    idFactory: webIdFactory,
  })
  const {
    data,
    view,
    settingsOpen,
    now,
    calendarCursor,
    toast,
    unseenReleases,
    releaseNotesOpen,
    actions,
  } = controller

  useWebAppEffects(view)

  const navigate = useCallback((nextView) => {
    actions.navigate(nextView)
    scrollWebToTop()
  }, [actions.navigate])

  const resetData = useCallback(() => {
    if (!confirmWebDataReset()) return
    actions.resetData()
  }, [actions.resetData])

  const exportBackup = useCallback(() => {
    webBackupAdapter.exportBackup(data)
  }, [data])

  const importBackup = useCallback((file) => (
    importWebBackup(file, {
      backupAdapter: webBackupAdapter,
      onImport: actions.importData,
      onInvalidFile: alertInvalidWebBackup,
    })
  ), [actions.importData])

  const views = {
    today: <TodayView data={data} now={now} onLeaveToggle={actions.toggleLeave} onNavigate={navigate} />,
    convert: (
      <ConvertView
        data={data}
        modalTarget={globalThis.document?.body}
        onAddItem={actions.addConversionItem}
        onUpdateItem={actions.updateConversionItem}
        onDeleteItem={actions.deleteConversionItem}
      />
    ),
    calendar: (
      <CalendarView
        data={data}
        cursor={calendarCursor}
        onCursorChange={actions.setCalendarCursor}
        onToggleDay={actions.toggleDay}
      />
    ),
    profile: (
      <ProfileView
        data={data}
        now={now}
        onLeaveToggle={actions.toggleLeave}
        onHeadphoneChange={actions.updateHeadphone}
        onExport={exportBackup}
        importAction={<WebBackupImportAction onImportFile={importBackup} />}
        onReset={resetData}
        storageDescription={WEB_STORAGE_DESCRIPTION}
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
          {unseenReleases.length > 0 && !releaseNotesOpen ? (
            <button
              className="release-label release-unread-button"
              type="button"
              aria-label={`查看 ${unseenReleases.length} 条未读更新`}
              onClick={actions.openReleaseNotes}
            >
              NEW · {unseenReleases.length}
            </button>
          ) : null}
          <button className="icon-button" type="button" aria-label="打开工作参数" onClick={actions.openSettings}>
            <Icon name="sliders" size={21} />
          </button>
        </div>
      </header>

      <main className="app-main" key={view}>{views[view]}</main>
      <BottomNav active={view} onChange={navigate} />

      <SettingsModal
        open={settingsOpen}
        settings={data.settings}
        keyboardTarget={globalThis.window}
        modalTarget={globalThis.document?.body}
        onClose={actions.closeSettings}
        onSave={actions.saveSettings}
      />

      <ReleaseNotesModal
        open={releaseNotesOpen}
        releases={unseenReleases}
        modalTarget={globalThis.document?.body}
        storageNote={WEB_RELEASE_STORAGE_NOTE}
        onDismiss={actions.dismissReleaseNotes}
        onAcknowledge={actions.acknowledgeReleaseNotes}
      />

      {toast ? <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div> : null}
    </div>
  )
}
