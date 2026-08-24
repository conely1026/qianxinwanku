import { useState } from 'react'
import { Icon } from '../components/Icons'
import { getRates } from '../lib/time'

const DEFAULT_ITEMS = [
  { id: 'coffee', name: '一杯咖啡', price: 15 },
  { id: 'lunch', name: '一顿午饭', price: 35 },
  { id: 'movie', name: '一张电影票', price: 55 },
  { id: 'show', name: '一场演出', price: 680 },
  { id: 'sneakers', name: '一双球鞋', price: 899 },
  { id: 'shoes', name: '球鞋', price: 699 },
]

function formatWorkTime(minutes) {
  if (minutes < 1) return '不到 1 分钟'
  if (minutes >= 480) {
    const days = Math.floor(minutes / 480)
    const rest = Math.round(minutes % 480)
    return rest ? `${days} 天 ${rest} 分钟` : `${days} 个工作日`
  }
  return `${Math.round(minutes)} 分钟`
}

export function ConvertView({ data, onAddItem, onDeleteItem }) {
  const [draft, setDraft] = useState({ name: '', price: '' })
  const rate = getRates(data.settings).minute
  const allItems = [...DEFAULT_ITEMS, ...data.customItems]

  function submit(event) {
    event.preventDefault()
    const name = draft.name.trim()
    const price = Number(draft.price)
    if (!name || !Number.isFinite(price) || price <= 0) return
    onAddItem({ id: crypto.randomUUID(), name, price })
    setDraft({ name: '', price: '' })
  }

  return (
    <div className="view-stack convert-view">
      <div className="editorial-intro">
        <p className="micro-label">TIME PRICE / 时间价格</p>
        <h1>你买的不是东西，<br />是上班时间。</h1>
        <p>用真实时薪重新估量一次消费。自定义项目只保存在你的设备中。</p>
      </div>

      <div className="conversion-grid">
        {allItems.map((item) => (
          <article className="conversion-item" key={item.id}>
            <div>
              <h2>{item.name}</h2>
              <span>¥{Number(item.price).toLocaleString('zh-CN')}</span>
            </div>
            <strong>{formatWorkTime(item.price / rate)}</strong>
            <small>当前工资口径约 ¥{rate.toFixed(2)} / 分钟</small>
            {String(item.id).length > 12 ? (
              <button className="delete-item" type="button" aria-label={`删除 ${item.name}`} onClick={() => onDeleteItem(item.id)}>
                <Icon name="close" size={16} />
              </button>
            ) : null}
          </article>
        ))}
      </div>

      <form className="custom-item-form" onSubmit={submit}>
        <div className="custom-form-title">
          <span className="plus-mark"><Icon name="plus" /></span>
          <div>
            <h2>自定义换算</h2>
            <p>加一笔常见消费，看看它需要卖掉多少时间。</p>
          </div>
        </div>
        <label>
          <span>项目名称</span>
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="例如：周末短途旅行" />
        </label>
        <label>
          <span>价格</span>
          <input type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} placeholder="¥ 0.00" />
        </label>
        <button className="dark-button" type="submit">加入换算</button>
      </form>
    </div>
  )
}
