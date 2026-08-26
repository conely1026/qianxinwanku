import { createPortal } from 'react-dom'
import { useState } from 'react'
import { Icon } from './Icons'

export function ReleaseNotesModal({ open, releases, onClose }) {
  const [activeReleaseId, setActiveReleaseId] = useState(null)
  if (!open || !releases.length) return null

  const multipleReleases = releases.length > 1
  const selectedIndex = releases.findIndex((release) => release.id === activeReleaseId)
  const activeIndex = Math.max(0, selectedIndex)
  const activeRelease = releases[activeIndex]

  function showReleaseAt(index) {
    if (index < 0 || index >= releases.length) return
    setActiveReleaseId(releases[index].id)
  }

  return createPortal((
    <div className="modal-backdrop release-backdrop" role="presentation">
      <section className="release-modal" role="dialog" aria-modal="true" aria-labelledby="release-title">
        <header className="release-header">
          <span className="release-label">
            NEW / {multipleReleases ? 'RELEASE' : activeRelease.label}
          </span>
          <button className="icon-button" type="button" aria-label="关闭更新说明" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </header>

        <h2 id="release-title">这次更新了这些</h2>
        <div className="release-page-toolbar">
          <strong>{activeRelease.label}</strong>
          {multipleReleases ? (
            <div className="release-pagination" aria-label="切换更新说明">
              <button
                type="button"
                aria-label="上一条更新"
                disabled={activeIndex === 0}
                onClick={() => showReleaseAt(activeIndex - 1)}
              >
                <Icon name="chevronLeft" size={18} />
              </button>
              <span>{activeIndex + 1} / {releases.length}</span>
              <button
                type="button"
                aria-label="下一条更新"
                disabled={activeIndex === releases.length - 1}
                onClick={() => showReleaseAt(activeIndex + 1)}
              >
                <Icon name="chevronRight" size={18} />
              </button>
            </div>
          ) : null}
        </div>
        <div className="release-scroll">
          <section className="release-group" key={activeRelease.id} aria-live="polite">
            <ul className="release-list">
              {activeRelease.highlights.map((item) => (
                <li key={`${activeRelease.id}-${item.title}`}>
                  <span><Icon name="check" size={16} /></span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="release-storage-note">本次更新不会清空当前浏览器里的本机数据。</p>
        <button className="primary-button release-acknowledge" type="button" onClick={onClose}>知道了</button>
      </section>
    </div>
  ), document.body)
}
