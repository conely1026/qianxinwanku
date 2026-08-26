import { Icon } from './Icons'
import { reconcileLeaveSession } from '../lib/leaveSession'
import { formatDuration, formatMoney, getRates } from '../lib/time'

export function getLeaveSeconds(session, now) {
  const live = session.running && session.startedAt
    ? Math.max(0, Math.floor((now.getTime() - session.startedAt) / 1000))
    : 0
  return Number(session.accumulatedSeconds || 0) + live
}

export function LeaveTimer({ session, now, settings, attendance, onToggle, compact = false }) {
  const activeSession = reconcileLeaveSession(session, now, settings, attendance)
  const seconds = getLeaveSeconds(activeSession, now)
  const value = seconds * getRates(settings).second

  return (
    <section className={`leave-timer ${compact ? 'is-compact' : ''}`}>
      <div>
        <p className="micro-label">LEAVE</p>
        <h3>离席</h3>
        <p className="muted">离开工位也在计价，每天到下次上班（{settings.startTime}）自动清零。</p>
      </div>
      <div className="leave-state">
        <div>
          <strong>{seconds ? formatDuration(seconds) : '尚未开始'}</strong>
          {seconds ? <span>{formatMoney(value)}</span> : null}
        </div>
        <button className="dark-button timer-button" type="button" onClick={onToggle}>
          <Icon name={activeSession.running ? 'pause' : 'play'} size={18} />
          {activeSession.running ? '暂停计时' : seconds ? '继续计时' : '开始计时'}
        </button>
      </div>
    </section>
  )
}
