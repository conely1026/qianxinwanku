import { useCallback, useEffect, useState } from 'react'

export const STORAGE_KEY = 'qianxinwanku:state:v1'

export const DEFAULT_CONVERSION_ITEMS = [
  { id: 'coffee', name: '一杯咖啡', price: 15 },
  { id: 'lunch', name: '一顿午饭', price: 35 },
  { id: 'movie', name: '一张电影票', price: 55 },
  { id: 'show', name: '一场演出', price: 680 },
  { id: 'sneakers', name: '一双球鞋', price: 899 },
  { id: 'shoes', name: '球鞋', price: 699 },
]

export const DEFAULT_STATE = {
  version: 1,
  settings: {
    monthlySalary: 3000,
    workdays: 22,
    startTime: '09:00',
    endTime: '18:00',
    endDayOffset: 0,
    lunchStart: '12:00',
    lunchEnd: '13:00',
    payday: 10,
    displayBasis: 'gross',
  },
  conversionItems: DEFAULT_CONVERSION_ITEMS,
  attendance: {},
  leaveSession: {
    running: false,
    startedAt: null,
    accumulatedSeconds: 0,
    periodStartedAt: null,
  },
  headphone: {
    price: 1299,
    hours: 100,
  },
  lastView: 'today',
}

function normalizeConversionItems(items) {
  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      name: String(item.name || '').trim(),
      price: Number(item.price),
    }))
    .filter((item) => item.name && Number.isFinite(item.price) && item.price > 0)
}

export function normalizeState(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) return DEFAULT_STATE
  const legacyCustomItems = Array.isArray(value.customItems) ? value.customItems : []
  const conversionItems = Array.isArray(value.conversionItems)
    ? value.conversionItems
    : [...DEFAULT_CONVERSION_ITEMS, ...legacyCustomItems]
  const { customItems: _legacyCustomItems, ...currentValue } = value
  return {
    ...DEFAULT_STATE,
    ...currentValue,
    settings: { ...DEFAULT_STATE.settings, ...(value.settings || {}) },
    conversionItems: normalizeConversionItems(conversionItems),
    attendance: value.attendance && typeof value.attendance === 'object' ? value.attendance : {},
    leaveSession: { ...DEFAULT_STATE.leaveSession, ...(value.leaveSession || {}) },
    headphone: { ...DEFAULT_STATE.headphone, ...(value.headphone || {}) },
  }
}

function readState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? normalizeState(JSON.parse(stored)) : DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

export function usePersistentState() {
  const [data, setData] = useState(readState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // The app still works in-memory when storage is unavailable.
    }
  }, [data])

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        setData(normalizeState(JSON.parse(event.newValue)))
      } catch {
        // Ignore malformed updates from another tab.
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const replaceData = useCallback((nextData) => {
    setData(normalizeState(nextData))
  }, [])

  return [data, setData, replaceData]
}
