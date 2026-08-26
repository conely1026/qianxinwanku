import { useEffect, useState } from 'react'
import { isValidSchedule, parseTime } from '../lib/time'
import { Icon } from './Icons'
import { ModalPortal } from './ModalPortal'

const FIELD_GROUPS = [
  [
    { key: 'monthlySalary', label: '税前月薪', type: 'number', min: 0, step: 100 },
    { key: 'workdays', label: '每月工作日', type: 'number', min: 1, max: 31, step: 1 },
  ],
  [
    { key: 'startTime', label: '上班时间', type: 'time' },
    { key: 'endTime', label: '下班时间', type: 'time', supportsDayOffset: true },
  ],
  [
    { key: 'lunchStart', label: '午休开始', type: 'time' },
    { key: 'lunchEnd', label: '午休结束', type: 'time' },
  ],
]

export function SettingsModal({ open, settings, keyboardTarget, modalTarget, onClose, onSave }) {
  const [form, setForm] = useState(settings)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(settings)
      setError('')
    }
  }, [open, settings])

  useEffect(() => {
    if (!open || !keyboardTarget?.addEventListener) return undefined
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    keyboardTarget.addEventListener('keydown', handleKey)
    return () => keyboardTarget.removeEventListener('keydown', handleKey)
  }, [keyboardTarget, open, onClose])

  if (!open) return null

  function update(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'endTime' && parseTime(value) <= parseTime(current.startTime)) {
        next.endDayOffset = 1
      }
      return next
    })
  }

  function submit(event) {
    event.preventDefault()
    if (!isValidSchedule(form)) {
      setError('请确认时间顺序；跨午夜下班请选择“+1天”。')
      return
    }
    onSave({
      ...form,
      monthlySalary: Number(form.monthlySalary),
      workdays: Number(form.workdays),
      payday: Number(form.payday),
      endDayOffset: Number(form.endDayOffset) === 1 ? 1 : 0,
    })
  }

  return (
    <ModalPortal target={modalTarget}>
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
            <div
              className={`settings-row${group.some((field) => field.supportsDayOffset) ? ' time-settings-row' : ''}`}
              key={group[0].key}
            >
              {group.map(({ key, label, supportsDayOffset, ...inputProps }) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <div className={supportsDayOffset ? 'time-with-offset' : undefined}>
                    <input
                      {...inputProps}
                      aria-label={label}
                      value={form[key]}
                      onChange={(event) => update(key, event.target.value)}
                      required
                    />
                    {supportsDayOffset ? (
                      <select
                        className="day-offset-select"
                        aria-label="下班日期"
                        value={Number(form.endDayOffset) === 1 ? 1 : 0}
                        onChange={(event) => update('endDayOffset', Number(event.target.value))}
                      >
                        <option value={0}>当天</option>
                        <option value={1}>+1天</option>
                      </select>
                    ) : null}
                  </div>
                  {supportsDayOffset ? <small className="field-hint">凌晨下班请选择 +1天</small> : null}
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
    </ModalPortal>
  )
}
