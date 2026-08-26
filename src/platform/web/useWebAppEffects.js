import { useEffect } from 'react'

const VIEW_TITLES = {
  today: '今日',
  convert: '换算',
  calendar: '日历',
  profile: '我的',
}

export function registerWebServiceWorker(navigatorObject = globalThis.navigator) {
  if (!navigatorObject || !('serviceWorker' in navigatorObject)) return
  navigatorObject.serviceWorker.register('./sw.js').catch(() => {})
}

export function setWebDocumentTitle(view, documentObject = globalThis.document) {
  if (!documentObject) return
  documentObject.title = `${VIEW_TITLES[view]} · 千薪万苦`
}

export function useWebAppEffects(view) {
  useEffect(() => {
    registerWebServiceWorker()
  }, [])

  useEffect(() => {
    setWebDocumentTitle(view)
  }, [view])
}
