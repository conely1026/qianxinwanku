import { Icon } from '../../../components/Icons'
import { formatDuration, formatMoney } from '../../../lib/time'

export function CapsuleCompactView({ model, actions }) {
  return (
    <section
      className="desktop-widget desktop-widget-capsule"
      aria-label="千薪万苦桌面挂件"
      data-window-drag-region
    >
      <div
        className="desktop-widget-main-action"
      >
        <span className={`desktop-widget-phase-dot is-${model.phase}`} />
        <span>
          <strong>{model.status.label}</strong>
          <small>{model.status.detail}</small>
        </span>
        <b>{formatMoney(model.income.earned)}</b>
      </div>

      {model.timer ? (
        <div className="desktop-widget-metrics">
          <span>{formatDuration(model.timer.seconds)}</span>
        </div>
      ) : null}

      <div className="desktop-widget-actions" data-window-no-drag>
        <button type="button" aria-label={model.leave.running ? '结束离席' : '开始离席'} onClick={actions.toggleLeave}>
          <Icon name="clock" size={16} />
        </button>
        <button
          type="button"
          aria-label={model.release.unseenCount > 0 ? `展开挂件，含 ${model.release.unseenCount} 条更新` : '展开挂件'}
          onClick={actions.toggleExpanded}
        >
          <Icon name="expand" size={16} />
          {model.release.unseenCount > 0 ? (
            <span className="desktop-widget-release-count">{model.release.unseenCount}</span>
          ) : null}
        </button>
      </div>
    </section>
  )
}
