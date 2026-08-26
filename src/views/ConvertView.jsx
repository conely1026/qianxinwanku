import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../components/Icons'
import { getRates } from '../lib/time'

function formatWorkTime(minutes) {
  if (minutes < 1) return '不到 1 分钟'
  if (minutes >= 480) {
    const days = Math.floor(minutes / 480)
    const rest = Math.round(minutes % 480)
    return rest ? `${days} 天 ${rest} 分钟` : `${days} 个工作日`
  }
  return `${Math.round(minutes)} 分钟`
}

function normalizeDraft(draft) {
  const name = draft.name.trim()
  const price = Number(draft.price)
  return name && Number.isFinite(price) && price > 0 ? { name, price } : null
}

export function ConvertView({ data, onAddItem, onUpdateItem, onDeleteItem }) {
  const [draft, setDraft] = useState({ name: '', price: '' })
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ name: '', price: '' })
  const [pendingDeleteItem, setPendingDeleteItem] = useState(null)
  const rate = getRates(data.settings).minute

  function submitNewItem(event) {
    event.preventDefault()
    const item = normalizeDraft(draft)
    if (!item) return
    onAddItem({ id: crypto.randomUUID(), ...item })
    setDraft({ name: '', price: '' })
  }

  function startEditing(item) {
    setEditingId(item.id)
    setEditDraft({ name: item.name, price: String(item.price) })
  }

  function cancelEditing() {
    setEditingId(null)
    setEditDraft({ name: '', price: '' })
  }

  function submitEdit(event, id) {
    event.preventDefault()
    const item = normalizeDraft(editDraft)
    if (!item) return
    onUpdateItem({ id, ...item })
    cancelEditing()
  }

  function confirmDelete() {
    if (!pendingDeleteItem) return
    onDeleteItem(pendingDeleteItem.id)
    if (editingId === pendingDeleteItem.id) cancelEditing()
    setPendingDeleteItem(null)
  }

  return (
    <div className="view-stack convert-view">
      <div className="editorial-intro">
        <p className="micro-label">TIME PRICE / 时间价格</p>
        <h1>你买的不是东西，<br />是上班时间。</h1>
        <p>用真实时薪重新估量一次消费。项目修改只保存在你的设备中。</p>
      </div>

      <div className="conversion-grid">
        {data.conversionItems.map((item) => (
          <article className={`conversion-item${editingId === item.id ? ' is-editing' : ''}`} key={item.id}>
            {editingId === item.id ? (
              <form className="conversion-edit-form" onSubmit={(event) => submitEdit(event, item.id)}>
                <label>
                  <span>项目名称</span>
                  <input
                    aria-label={`编辑 ${item.name} 的名称`}
                    value={editDraft.name}
                    onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>价格</span>
                  <input
                    aria-label={`编辑 ${item.name} 的价格`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editDraft.price}
                    onChange={(event) => setEditDraft((current) => ({ ...current, price: event.target.value }))}
                    required
                  />
                </label>
                <div className="conversion-edit-actions">
                  <button className="text-button" type="button" onClick={cancelEditing}>取消</button>
                  <button className="dark-button" type="submit">保存</button>
                </div>
              </form>
            ) : (
              <>
                <div className="conversion-heading">
                  <h2>{item.name}</h2>
                  <span>¥{Number(item.price).toLocaleString('zh-CN')}</span>
                </div>
                <strong>{formatWorkTime(item.price / rate)}</strong>
                <div className="conversion-footer">
                  <small>当前工资口径约 ¥{rate.toFixed(2)} / 分钟</small>
                  <button className="edit-item" type="button" onClick={() => startEditing(item)}>编辑</button>
                </div>
              </>
            )}
            <button className="delete-item" type="button" aria-label={`删除 ${item.name}`} onClick={() => setPendingDeleteItem(item)}>
              <Icon name="close" size={17} />
            </button>
          </article>
        ))}
        {data.conversionItems.length === 0 ? (
          <p className="conversion-empty">还没有换算项目，可以在下方添加一个。</p>
        ) : null}
      </div>

      <form className="custom-item-form" onSubmit={submitNewItem}>
        <div className="custom-form-title">
          <span className="plus-mark"><Icon name="plus" /></span>
          <div>
            <h2>自定义换算</h2>
            <p>加一笔常见消费，看看它需要卖掉多少时间。</p>
          </div>
        </div>
        <label>
          <span>项目名称</span>
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="例如：周末短途旅行" required />
        </label>
        <label>
          <span>价格</span>
          <input type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} placeholder="¥ 0.00" required />
        </label>
        <button className="dark-button" type="submit">加入换算</button>
      </form>

      {pendingDeleteItem ? createPortal((
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPendingDeleteItem(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
            <span className="confirm-icon"><Icon name="trash" size={24} /></span>
            <h2 id="delete-confirm-title">删除“{pendingDeleteItem.name}”？</h2>
            <p>删除后无法恢复，确定要继续吗？</p>
            <div className="confirm-actions">
              <button className="text-button" type="button" onClick={() => setPendingDeleteItem(null)}>取消</button>
              <button className="danger-button" type="button" onClick={confirmDelete}>确认删除</button>
            </div>
          </section>
        </div>
      ), document.body) : null}
    </div>
  )
}
