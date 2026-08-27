import { Icon } from '../components/Icons'
import { LeaveTimer } from '../components/LeaveTimer'
import { countWorkdays, formatMoney, getRates } from '../lib/time'

export function ProfileView({
  data,
  now,
  onLeaveToggle,
  onHeadphoneChange,
  onExport,
  importAction,
  desktopDownloadAction,
  onReset,
  storageDescription,
}) {
  const rates = getRates(data.settings)
  const year = now.getFullYear()
  let elapsedWorkdays = 0
  for (let month = 0; month <= now.getMonth(); month += 1) {
    const through = month === now.getMonth() ? now : null
    elapsedWorkdays += countWorkdays(year, month, data.attendance, through)
  }

  return (
    <div className="view-stack profile-view">
      <div className="editorial-intro profile-intro">
        <p className="micro-label">PERSONAL LEDGER / 我的时间账本</p>
        <h1>一些不必严肃的统计。</h1>
        <p>这些数据只留在当前设备，不上传云端，也不需要账号。</p>
      </div>

      <LeaveTimer
        session={data.leaveSession}
        now={now}
        settings={data.settings}
        attendance={data.attendance}
        onToggle={onLeaveToggle}
      />

      <section className="profile-section headphone-section">
        <p className="micro-label">COST PER USE</p>
        <h2>耳机使用成本</h2>
        <p className="muted">比“回本”更诚实：每用一次，每小时成本都在下降。</p>
        <div className="headphone-form">
          <label><span>购入价格 ¥</span><input type="number" min="0" value={data.headphone.price} onChange={(event) => onHeadphoneChange('price', Number(event.target.value))} /></label>
          <label><span>已使用小时</span><input type="number" min="1" value={data.headphone.hours} onChange={(event) => onHeadphoneChange('hours', Number(event.target.value))} /></label>
          <strong>{formatMoney(data.headphone.price / Math.max(1, data.headphone.hours))} / 小时</strong>
        </div>
      </section>

      <section className="profile-section trajectory-section">
        <p className="micro-label">YEAR TO DATE</p>
        <h2>年度工资轨迹</h2>
        <p className="muted">按当前参数与工作日粗略估算，不含奖金与加班。</p>
        <dl className="year-metrics">
          <div><dt>累计工资</dt><dd>{formatMoney(rates.daily * elapsedWorkdays)}</dd></div>
          <div><dt>出售时间</dt><dd>{elapsedWorkdays} 天</dd></div>
          <div><dt>每秒价格</dt><dd>{formatMoney(rates.second)}</dd></div>
        </dl>
      </section>

      {desktopDownloadAction ? (
        <section className="profile-section desktop-download-section">
          <div className="desktop-download-copy">
            <p className="micro-label">WINDOWS DESKTOP</p>
            <h2>把下班倒计时放到桌面上。</h2>
            <p className="muted">Windows x64 便携版，无需安装；新版本统一从 GitHub Releases 获取。</p>
          </div>
          {desktopDownloadAction}
        </section>
      ) : null}

      <section className="profile-section local-section">
        <div className="local-copy">
          <span className="local-icon"><Icon name="database" /></span>
          <div>
            <h2>本地数据</h2>
            <p>{storageDescription}</p>
          </div>
        </div>
        <div className="data-actions">
          <button className="secondary-button" type="button" onClick={onExport}><Icon name="download" size={18} />导出备份</button>
          {importAction}
          <button className="danger-button" type="button" onClick={onReset}><Icon name="trash" size={18} />清空本机数据</button>
        </div>
      </section>
    </div>
  )
}
