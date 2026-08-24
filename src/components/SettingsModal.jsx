import { useEffect, useState } from 'react'
import { Icon } from './Icons'

const FIELD_GROUPS = [
  [
    { key: 'monthlySalary', label: '税前月薪', type: 'number', min: 0, step: 100 },
    { key: 'workdays', label: '每月工作日', type: 'number', min: 1, max: 31, step: 1 },
  ],
  [
    { key: 'startTime', label: '上班时间', type: 'time' },
    { key: 'endTime', label: '下班时间', type: 'time' },
  ],
  [
    { key: 'lunchStart', label: '午休开始', type: 'time' },
    { key: 'lunchEnd', label: '午休结束', type: 'time' },
  ],
]

function toMinutes(value) {
  const [hours, minutes] = String(value).split(':').map(Number)
  return hours * 60 + minutes
}

export function SettingsModal({ open, settings, onClose, onSave }) {
  const [form, setForm] = useState(settings)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(settings)
      setError('')
    }
  }, [open, settings])

  useEffect(() => {
    if (!open) return undefined
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    const start = toMinutes(form.startTime)
    const end = toMinutes(form.endTime)
    const lunchStart = toMinutes(form.lunchStart)
    const lunchEnd = toMinutes(form.lunchEnd)
    if (end <= start || lunchStart < start || lunchEnd > end || lunchEnd <= lunchStart) {
      setError('请确认上下班和午休时间的先后顺序。')
      return
    }
    onSave({
      ...form,
      monthlySalary: Number(form.monthlySalary),
      workdays: Number(form.workdays),
      payday: Number(form.payday),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="modal-header">
          <h2 id="settings-title">工作参数</h2>
          <button className="icon-button" type="button" aria-label="关闭工作参数" onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
        </header>

        <form onSubmit={submit}>
          {FIELD_GROUPS.map((group) => (
            <div className="settings-row" key={group[0].key}>
              {group.map(({ key, label, ...inputProps }) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input
                    {...inputProps}
                    aria-label={label}
                    value={form[key]}
                    onChange={(event) => update(key, event.target.value)}
                    required
                  />
                </label>
              ))}
            </div>
          ))}

          <div className="settings-row">
            <label className="field">
              <span>每月发薪日</span>
              <input type="number" min="1" max="31" value={form.payday} onChange={(event) => update('payday', event.target.value)} required />
            </label>
            <label className="field">
              <span>展示口径</span>
              <select value={form.displayBasis} onChange={(event) => update('displayBasis', event.target.value)}>
                <option value="gross">税前收入</option>
                <option value="net">到手估算（税前 × 80%）</option>
              </select>
            </label>
          </div>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <div className="modal-actions">
            <button className="text-button" type="button" onClick={onClose}>取消</button>
            <button className="primary-button" type="submit">保存参数</button>
          </div>
        </form>
      </section>
    </div>
  )
}
