import { Icon } from './Icons'

const NAV_ITEMS = [
  { id: 'today', label: '今日', icon: 'clock' },
  { id: 'convert', label: '换算', icon: 'wallet' },
  { id: 'calendar', label: '日历', icon: 'calendar' },
  { id: 'profile', label: '我的', icon: 'user' },
]

export function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {NAV_ITEMS.map((item) => (
        <button
          className={`nav-item ${active === item.id ? 'is-active' : ''}`}
          key={item.id}
          type="button"
          aria-current={active === item.id ? 'page' : undefined}
          onClick={() => onChange(item.id)}
        >
          <span className="nav-icon"><Icon name={item.icon} size={20} /></span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
