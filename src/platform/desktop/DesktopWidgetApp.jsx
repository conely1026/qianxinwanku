import { useCallback, useMemo } from 'react'
import { Icon } from '../../components/Icons.jsx'
import { ReleaseNotesModal } from '../../components/ReleaseNotesModal.jsx'
import { SettingsModal } from '../../components/SettingsModal.jsx'
import { CalendarView } from '../../views/CalendarView.jsx'
import { ConvertView } from '../../views/ConvertView.jsx'
import { ProfileView } from '../../views/ProfileView.jsx'
import { TodayView } from '../../views/TodayView.jsx'
import { DesktopBackupImportAction } from './DesktopBackupImportAction.jsx'
import {
  confirmDesktopDataReset,
  DESKTOP_RELEASE_STORAGE_NOTE,
  DESKTOP_STORAGE_DESCRIPTION,
  notifyDesktopActionError,
} from './desktopAppActions.js'
import { createDesktopBackupAdapter } from './desktopBackup.js'

const DESKTOP_NAV_ITEMS = Object.freeze([
  { id: 'today', label: '今日', icon: 'clock' },
  { id: 'convert', label: '换算', icon: 'wallet' },
  { id: 'calendar', label: '日历', icon: 'calendar' },
  { id: 'profile', label: '我的', icon: 'user' },
])

const DESKTOP_SCALE_OPTIONS = Object.freeze([
  { value: 1, label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200%' },
])

export function DesktopWidgetApp({
  model,
  skin,
  skins,
  expanded,
  controller,
  bridge,
  compactScale,
  onBridgeError,
  skinActions,
  panelActions,
}) {
  const CompactView = skin.CompactView

  return (
    <main
      className={`desktop-renderer-shell is-skin-${skin.id} ${expanded ? 'is-expanded' : 'is-compact'} ${model.window.locked ? 'is-window-locked' : ''}`}
    >
      {expanded ? (
        <DesktopExpandedPanel
          model={model}
          skin={skin}
          skins={skins}
          controller={controller}
          bridge={bridge}
          compactScale={compactScale}
          onBridgeError={onBridgeError}
          actions={panelActions}
        />
      ) : (
        <div
          className="desktop-compact-scale"
          style={{ transform: `scale(${compactScale})` }}
        >
          <CompactView model={model} actions={skinActions} />
        </div>
      )}
    </main>
  )
}

function DesktopExpandedPanel({
  model,
  skin,
  skins,
  controller,
  bridge,
  compactScale,
  onBridgeError,
  actions,
}) {
  const backupAdapter = useMemo(() => createDesktopBackupAdapter(bridge), [bridge])
  const reportActionError = useCallback((error) => {
    notifyDesktopActionError(error)
    onBridgeError(error)
  }, [onBridgeError])
  const exportBackup = useCallback(async () => {
    try {
      await backupAdapter.exportBackup(controller.data)
    } catch (error) {
      reportActionError(error)
    }
  }, [backupAdapter, controller.data, reportActionError])
  const resetData = useCallback(() => {
    if (confirmDesktopDataReset()) controller.actions.resetData()
  }, [controller.actions])

  const views = {
    today: (
      <TodayView
        data={controller.data}
        now={controller.now}
        onLeaveToggle={controller.actions.toggleLeave}
        onNavigate={controller.actions.navigate}
      />
    ),
    convert: (
      <ConvertView
        data={controller.data}
        onAddItem={controller.actions.addConversionItem}
        onUpdateItem={controller.actions.updateConversionItem}
        onDeleteItem={controller.actions.deleteConversionItem}
      />
    ),
    calendar: (
      <CalendarView
        data={controller.data}
        cursor={controller.calendarCursor}
        onCursorChange={controller.actions.setCalendarCursor}
        onToggleDay={controller.actions.toggleDay}
      />
    ),
    profile: (
      <ProfileView
        data={controller.data}
        now={controller.now}
        onLeaveToggle={controller.actions.toggleLeave}
        onHeadphoneChange={controller.actions.updateHeadphone}
        onExport={exportBackup}
        importAction={(
          <DesktopBackupImportAction
            backupAdapter={backupAdapter}
            onImport={controller.actions.importData}
            onError={reportActionError}
          />
        )}
        onReset={resetData}
        storageDescription={DESKTOP_STORAGE_DESCRIPTION}
      />
    ),
  }

  return (
    <section className="desktop-expanded-panel" aria-label="千薪万苦桌面挂件详情">
      <header className="desktop-expanded-header" data-window-drag-region>
        <span className="desktop-expanded-brand" aria-hidden="true">¥</span>
        <span>
          <strong>{model.status.label}</strong>
          <small>{model.status.detail}</small>
        </span>
        <div className="desktop-expanded-header-actions" data-window-no-drag>
          {controller.unseenReleases.length > 0 && !controller.releaseNotesOpen ? (
            <button
              className="desktop-expanded-new"
              type="button"
              aria-label={`查看 ${controller.unseenReleases.length} 条未读更新`}
              onClick={controller.actions.openReleaseNotes}
            >
              NEW · {controller.unseenReleases.length}
            </button>
          ) : null}
          <button type="button" aria-label="打开工作参数" onClick={controller.actions.openSettings}>
            <Icon name="sliders" size={17} />
          </button>
          <button
            type="button"
            aria-label={model.window.locked ? '解除位置锁定' : '锁定挂件位置'}
            aria-pressed={model.window.locked}
            onClick={actions.toggleLocked}
          >
            <Icon name={model.window.locked ? 'lock' : 'unlock'} size={17} />
          </button>
          <button type="button" aria-label="收起挂件" onClick={actions.toggleExpanded}>
            <Icon name="close" size={17} />
          </button>
        </div>
      </header>

      <nav className="desktop-expanded-nav" aria-label="桌面版功能">
        {DESKTOP_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={controller.view === item.id ? 'page' : undefined}
            onClick={() => controller.actions.navigate(item.id)}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="desktop-expanded-content" data-window-no-drag>
        {views[controller.view] ?? views.today}

        <section className="desktop-widget-preferences" aria-labelledby="desktop-skin-title">
          <div className="desktop-widget-preference-row">
            <span>
              <strong id="desktop-skin-title">挂件皮肤</strong>
              <small>只改变外观，不影响工资和计时</small>
            </span>
            <div className="desktop-skin-options">
              {skins.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={option.id === skin.id}
                  onClick={() => actions.selectSkin(option.id)}
                >
                  {option.displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="desktop-widget-preference-row">
            <span>
              <strong>紧凑挂件大小</strong>
              <small>展开面板保持固定尺寸</small>
            </span>
            <div className="desktop-scale-options">
              {DESKTOP_SCALE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={compactScale === option.value}
                  onClick={() => actions.selectScale(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="desktop-preference-actions">
            <button
              type="button"
              aria-pressed={model.window.alwaysOnTop}
              onClick={actions.toggleAlwaysOnTop}
            >
              <span>窗口置顶</span>
              <b>{model.window.alwaysOnTop ? '已开启' : '已关闭'}</b>
            </button>
            <button
              type="button"
              aria-pressed={model.window.locked}
              onClick={actions.toggleLocked}
            >
              <span>位置锁定</span>
              <b>{model.window.locked ? '已锁定' : '可拖动'}</b>
            </button>
          </div>
        </section>
      </div>

      <SettingsModal
        open={controller.settingsOpen}
        settings={controller.data.settings}
        keyboardTarget={globalThis.window}
        onClose={controller.actions.closeSettings}
        onSave={controller.actions.saveSettings}
      />

      <ReleaseNotesModal
        open={controller.releaseNotesOpen}
        releases={controller.unseenReleases}
        storageNote={DESKTOP_RELEASE_STORAGE_NOTE}
        onDismiss={controller.actions.dismissReleaseNotes}
        onAcknowledge={controller.actions.acknowledgeReleaseNotes}
      />

      {controller.toast ? (
        <div className="toast desktop-toast" role="status">
          <Icon name="check" size={17} />
          {controller.toast}
        </div>
      ) : null}
    </section>
  )
}
