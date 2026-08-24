import { useCallback, useEffect, useState } from 'react'

export const STORAGE_KEY = 'qianxinwanku:state:v1'

export const DEFAULT_STATE = {
  version: 1,
  settings: {
    monthlySalary: 3000,
    workdays: 22,
    startTime: '09:00',
    endTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    payday: 10,
    displayBasis: 'gross',
  },
  customItems: [],
  attendance: {},
  leaveSession: {
    running: false,
    startedAt: null,
    accumulatedSeconds: 0,
  },
  headphone: {
    price: 1299,
    hours: 100,
  },
  lastView: 'today',
}

function normalizeState(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) return DEFAULT_STATE
  return {
    ...DEFAULT_STATE,
    ...value,
    settings: { ...DEFAULT_STATE.settings, ...(value.settings || {}) },
    customItems: Array.isArray(value.customItems) ? value.customItems : [],
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
