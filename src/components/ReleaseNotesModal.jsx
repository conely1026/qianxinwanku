import { createPortal } from 'react-dom'
import { Icon } from './Icons'

export function ReleaseNotesModal({ open, release, onClose }) {
  if (!open) return null

  return createPortal((
    <div className="modal-backdrop release-backdrop" role="presentation">
      <section className="release-modal" role="dialog" aria-modal="true" aria-labelledby="release-title">
        <header className="release-header">
          <span className="release-label">NEW / {release.label}</span>
          <button className="icon-button" type="button" aria-label="关闭更新说明" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </header>

        <h2 id="release-title">{release.title}</h2>
        <ul className="release-list">
          {release.highlights.map((item) => (
            <li key={item.title}>
              <span><Icon name="check" size={16} /></span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="release-storage-note">本次更新不会清空当前浏览器里的本机数据。</p>
        <button className="primary-button release-acknowledge" type="button" onClick={onClose}>知道了</button>
      </section>
    </div>
  ), document.body)
}
