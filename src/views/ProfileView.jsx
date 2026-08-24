import { useRef } from 'react'
import { Icon } from '../components/Icons'
import { LeaveTimer } from '../components/LeaveTimer'
import { countWorkdays, formatMoney, getRates } from '../lib/time'

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `千薪万苦-本地数据-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ProfileView({ data, now, onLeaveToggle, onHeadphoneChange, onImport, onReset }) {
  const fileInput = useRef(null)
  const rates = getRates(data.settings)
  const year = now.getFullYear()
  let elapsedWorkdays = 0
  for (let month = 0; month <= now.getMonth(); month += 1) {
    const through = month === now.getMonth() ? now : null
    elapsedWorkdays += countWorkdays(year, month, data.attendance, through)
  }

  async function importFile(event) {
    const [file] = event.target.files || []
    if (!file) return
    try {
      onImport(JSON.parse(await file.text()))
    } catch {
      window.alert('这个文件不是有效的千薪万苦数据。')
    }
    event.target.value = ''
  }

  return (
    <div className="view-stack profile-view">
      <div className="editorial-intro profile-intro">
        <p className="micro-label">PERSONAL LEDGER / 我的时间账本</p>
        <h1>一些不必严肃的统计。</h1>
        <p>这些数据只留在当前设备，不上传云端，也不需要账号。</p>
      </div>

      <LeaveTimer session={data.leaveSession} now={now} settings={data.settings} onToggle={onLeaveToggle} />

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

      <section className="profile-section local-section">
        <div className="local-copy">
          <span className="local-icon"><Icon name="database" /></span>
          <div>
            <h2>本地数据</h2>
            <p>参数、项目和统计使用 localStorage 保存；应用外壳会缓存以便再次打开或离线使用。</p>
          </div>
        </div>
        <div className="data-actions">
          <button className="secondary-button" type="button" onClick={() => downloadJson(data)}><Icon name="download" size={18} />导出备份</button>
          <button className="secondary-button" type="button" onClick={() => fileInput.current?.click()}><Icon name="upload" size={18} />导入备份</button>
          <button className="danger-button" type="button" onClick={onReset}><Icon name="trash" size={18} />清空本机数据</button>
          <input ref={fileInput} className="sr-only" type="file" accept="application/json" onChange={importFile} />
        </div>
      </section>
    </div>
  )
}
