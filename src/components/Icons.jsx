export function Icon({ name, size = 22, className = '' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className,
  }

  const paths = {
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3.4 2" /></>,
    wallet: <><path d="M4 7.5h13.5A2.5 2.5 0 0 1 20 10v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 2 17V7a2.5 2.5 0 0 1 2.5-2.5H16" /><path d="M15 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M7 3v4M17 3v4M3 10h18M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    sliders: <><path d="M4 6h8M16 6h4M4 12h3M11 12h9M4 18h10M18 18h2" /><circle cx="14" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></>,
    arrowLeft: <><path d="m9 6-6 6 6 6" /><path d="M3 12h18" /></>,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    coffee: <><path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" /><path d="M16 10h2a3 3 0 0 1 0 6h-2M7 4v1M11 3v2M15 4v1" /></>,
    play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: <><path d="M9 6v12M15 6v12" strokeWidth="2.6" /></>,
    download: <><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" /><path d="M4 19h16" /></>,
    upload: <><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5" /><path d="M4 19h16" /></>,
    database: <><ellipse cx="12" cy="5.5" rx="7" ry="3" /><path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></>,
    trash: <><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }

  return <svg {...common}>{paths[name] || paths.clock}</svg>
}
