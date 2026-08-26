import { Icon } from '../components/Icons'
import { LeaveTimer } from '../components/LeaveTimer'
import {
  formatDuration,
  formatMoney,
  getRates,
  getWorkSnapshot,
  shouldShowWorkCountdown,
} from '../lib/time'

export function TodayView({ data, now, onLeaveToggle, onNavigate }) {
  const snapshot = getWorkSnapshot(now, data.settings, data.attendance)
  const rates = getRates(data.settings)
  const coffeeCount = snapshot.earnings / 15
  const endDayLabel = Number(data.settings.endDayOffset) === 1 ? ' +1天' : ''
  const showCountdown = shouldShowWorkCountdown(snapshot.phase)

  return (
    <div className="view-stack today-view">
      <div className="section-heading">
        <p className="micro-label">TODAY / 今日出售时间</p>
      </div>

      <section className="hero-panel">
        <div className="status-line"><span className="status-dot" />{snapshot.status}</div>
        <div className="countdown-wrap">
          {showCountdown ? (
            <strong className="countdown">{formatDuration(snapshot.countdownSeconds)}</strong>
          ) : null}
          <span>{snapshot.statusDetail}</span>
        </div>
        <div className="shift-meter">
          <div className="meter-copy">
            <span>SHIFT {Math.round(snapshot.progress)}%</span>
            <span>{data.settings.startTime}—{data.settings.endTime}{endDayLabel}</span>
          </div>
          <div className="meter-track" aria-label={`今日班次进度 ${Math.round(snapshot.progress)}%`}>
            <span style={{ width: `${snapshot.progress}%` }} />
          </div>
        </div>
        <p className="today-note"><em>今日批注</em> 下班不是奖励，是边界。</p>
      </section>

      <div className="metric-pair">
        <section className="income-card">
          <p className="micro-label">01 / INCOME</p>
          <h2>今日已赚</h2>
          <strong>{formatMoney(snapshot.earnings)}</strong>
          <span>{formatMoney(rates.hourly)} / 小时</span>
          <span>{formatMoney(rates.second)} / 秒</span>
        </section>

        <section className="equivalent-card">
          <div className="card-number">02 / EQUIVALENT</div>
          <Icon name="coffee" size={34} />
          <strong>{coffeeCount.toFixed(coffeeCount < 10 ? 1 : 0)} 杯咖啡</strong>
          <span>每份按 ¥15 计算</span>
          <button className="link-button" type="button" onClick={() => onNavigate('convert')}>查看更多换算</button>
        </section>
      </div>

      <LeaveTimer
        compact
        session={data.leaveSession}
        now={now}
        settings={data.settings}
        attendance={data.attendance}
        onToggle={onLeaveToggle}
      />
    </div>
  )
}
