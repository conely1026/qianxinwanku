import { Icon } from '../../../components/Icons'
import { formatDuration, formatMoney } from '../../../lib/time'
import afterWorkImage from './office-cat/assets/office-cat-after-work-car-v5.png'
import beforeWorkImage from './office-cat/assets/office-cat-before-work.png'
import leaveImage from './office-cat/assets/office-cat-leave-skateboard-v5.png'
import lunchImage from './office-cat/assets/office-cat-lunch-keyboard-v5.png'
import restDayImage from './office-cat/assets/office-cat-rest-day-gaming-v4.png'
import workingImage from './office-cat/assets/office-cat-working-p1-round-paws-v3-rgba.png'

const PHASE_IMAGES = Object.freeze({
  'before-work': beforeWorkImage,
  working: workingImage,
  lunch: lunchImage,
  'paid-leave': leaveImage,
  'after-work': afterWorkImage,
  'rest-day': restDayImage,
})

export function OfficeCatCompactView({ model, actions }) {
  const image = PHASE_IMAGES[model.phase] || restDayImage

  return (
    <section
      className={`desktop-widget desktop-widget-office-cat is-${model.phase}`}
      aria-label="小猫上班桌面挂件"
      data-window-drag-region
    >
      <img className="office-cat-scene" src={image} alt="" draggable="false" />

      <div
        className="office-cat-main-action"
      >
        <span className="office-cat-copy">
          <strong>{model.status.label}</strong>
          <small>{model.status.detail}</small>
        </span>
        <b>{formatMoney(model.income.earned)}</b>
        {model.timer ? <em>{formatDuration(model.timer.seconds)}</em> : null}
        <span className="office-cat-progress" aria-hidden="true">
          <i style={{ width: `${Math.min(100, Math.max(0, model.shift.progress))}%` }} />
        </span>
      </div>

      <div className="office-cat-actions" data-window-no-drag>
        <button type="button" aria-label={model.leave.running ? '结束离席' : '开始离席'} onClick={actions.toggleLeave}>
          <Icon name="clock" size={17} />
        </button>
        <button
          type="button"
          aria-label={model.release.unseenCount > 0 ? `展开挂件，含 ${model.release.unseenCount} 条更新` : '展开挂件'}
          onClick={actions.toggleExpanded}
        >
          <Icon name="expand" size={17} />
          {model.release.unseenCount > 0 ? (
            <span className="desktop-widget-release-count">{model.release.unseenCount}</span>
          ) : null}
        </button>
      </div>
    </section>
  )
}
