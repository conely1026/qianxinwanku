import { Icon } from '../components/Icons'
import { countWorkdays, dateKey, formatMoney, getRates, isDefaultWorkday, isWorkday, monthDays } from '../lib/time'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function CalendarView({ data, cursor, onCursorChange, onToggleDay }) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const days = monthDays(year, month)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const plannedDays = countWorkdays(year, month, data.attendance)
  const through = year === today.getFullYear() && month === today.getMonth() ? today : null
  const elapsedDays = through ? countWorkdays(year, month, data.attendance, through) : plannedDays
  const rates = getRates(data.settings)

  function move(offset) {
    onCursorChange(new Date(year, month + offset, 1))
  }

  return (
    <div className="view-stack calendar-view">
      <div className="calendar-header">
        <div>
          <p className="micro-label">WORK LOG / 时间账本</p>
          <h1>{year} 年 {month + 1} 月</h1>
          <p>点击日期可在“上班”和“休息”之间覆盖默认状态。</p>
        </div>
        <div className="month-controls">
          <button className="icon-button outlined" type="button" aria-label="上个月" onClick={() => move(-1)}><Icon name="chevronLeft" /></button>
          <button className="icon-button outlined" type="button" aria-label="下个月" onClick={() => move(1)}><Icon name="chevronRight" /></button>
        </div>
      </div>

      <section className="calendar-panel">
        <div className="weekday-row">
          {WEEKDAYS.map((day) => <span key={day}>周{day}</span>)}
        </div>
        <div className="day-grid">
          {days.map((date, index) => {
            if (!date) return <span className="day-cell is-empty" key={`empty-${index}`} />
            const key = dateKey(date)
            const worked = isWorkday(date, data.attendance)
            const overridden = Boolean(data.attendance[key])
            const isToday = key === dateKey(new Date())
            return (
              <button
                type="button"
                className={`day-cell ${worked ? 'is-work' : 'is-rest'} ${overridden ? 'is-overridden' : ''} ${isToday ? 'is-today' : ''}`}
                key={key}
                onClick={() => onToggleDay(date, isDefaultWorkday(date))}
                aria-label={`${key}，${worked ? '上班' : '休息'}${overridden ? '，已手动调整' : ''}`}
              >
                <span>{date.getDate()}</span>
                <small>{worked ? '班' : '休'}</small>
              </button>
            )
          })}
        </div>
      </section>

      <section className="month-summary">
        <div>
          <p className="micro-label">MONTH IN PROGRESS</p>
          <h2>本月时间账</h2>
        </div>
        <dl>
          <div><dt>计划工作</dt><dd>{plannedDays} 天</dd></div>
          <div><dt>已计工作</dt><dd>{elapsedDays} 天</dd></div>
          <div><dt>预计月薪</dt><dd>{formatMoney(rates.daily * plannedDays)}</dd></div>
        </dl>
      </section>
    </div>
  )
}
