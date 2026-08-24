import { Icon } from './Icons'
import { formatDuration, formatMoney, getRates } from '../lib/time'

export function getLeaveSeconds(session, now) {
  const live = session.running && session.startedAt
    ? Math.max(0, Math.floor((now.getTime() - session.startedAt) / 1000))
    : 0
  return Number(session.accumulatedSeconds || 0) + live
}

export function LeaveTimer({ session, now, settings, onToggle, compact = false }) {
  const seconds = getLeaveSeconds(session, now)
  const value = seconds * getRates(settings).second

  return (
    <section className={`leave-timer ${compact ? 'is-compact' : ''}`}>
      <div>
        <p className="micro-label">PAID BREAK</p>
        <h3>带薪离席</h3>
        <p className="muted">离开工位也在计价，看看这段时间值多少。</p>
      </div>
      <div className="leave-state">
        <div>
          <strong>{seconds ? formatDuration(seconds) : '尚未开始'}</strong>
          {seconds ? <span>{formatMoney(value)}</span> : null}
        </div>
        <button className="dark-button timer-button" type="button" onClick={onToggle}>
          <Icon name={session.running ? 'pause' : 'play'} size={18} />
          {session.running ? '暂停计时' : seconds ? '继续计时' : '开始计时'}
        </button>
      </div>
    </section>
  )
}
