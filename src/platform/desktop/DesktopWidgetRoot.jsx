import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppController } from '../../app/useAppController.js'
import { createDesktopWidgetViewModel } from '../../features/desktop-widget/model/createDesktopWidgetViewModel.js'
import { desktopWidgetSkinRegistry } from '../../features/desktop-widget/skins/builtInSkins.js'
import { usePersistentState } from '../../hooks/usePersistentState.js'
import { desktopIdFactory } from './desktopBridge.js'
import { desktopClock } from './desktopClock.js'
import { createDesktopReleaseService } from './desktopReleaseService.js'
import { DesktopWidgetApp } from './DesktopWidgetApp.jsx'

export const DESKTOP_EXPANDED_SIZE = Object.freeze({ width: 430, height: 620 })
const DESKTOP_COMPACT_SCALES = new Set([1, 1.25, 1.5, 2])

export function DesktopWidgetRoot({
  bridge,
  bootstrap,
  appStateStorage,
  preferencesStorage,
  onBridgeError = () => {},
  clock = desktopClock,
  idFactory = desktopIdFactory,
}) {
  const [preferences, setPreferences] = usePersistentState(preferencesStorage, {
    initialState: bootstrap.preferences,
  })
  const releaseService = useMemo(() => createDesktopReleaseService({
    lastSeenReleaseId: preferences.lastSeenReleaseId,
    markReleaseSeen(releaseId) {
      setPreferences((current) => (
        current.lastSeenReleaseId === releaseId
          ? current
          : { ...current, lastSeenReleaseId: releaseId }
      ))
    },
  }), [preferences.lastSeenReleaseId, setPreferences])
  const controller = useAppController({
    stateStorage: appStateStorage,
    releaseService,
    clock,
    idFactory,
  })
  const [expanded, setExpanded] = useState(() => controller.releaseNotesOpen)

  useEffect(() => {
    if (controller.releaseNotesOpen) setExpanded(true)
  }, [controller.releaseNotesOpen])

  const skin = desktopWidgetSkinRegistry.resolve(preferences.selectedSkinId)
  const skins = useMemo(() => desktopWidgetSkinRegistry.list(), [])
  const model = useMemo(() => createDesktopWidgetViewModel({
    appState: controller.data,
    now: controller.now,
    unseenReleaseCount: controller.unseenReleases.length,
    preferences,
  }), [controller.data, controller.now, controller.unseenReleases.length, preferences])

  const compactScale = DESKTOP_COMPACT_SCALES.has(preferences.scale) ? preferences.scale : 1
  const resizeWidth = expanded
    ? DESKTOP_EXPANDED_SIZE.width
    : Math.round(skin.compactSize.width * compactScale)
  const resizeHeight = expanded
    ? DESKTOP_EXPANDED_SIZE.height
    : Math.round(skin.compactSize.height * compactScale)

  useEffect(() => {
    resizeDesktopWindow(
      bridge,
      { width: resizeWidth, height: resizeHeight },
      onBridgeError,
    )
  }, [bridge, onBridgeError, resizeHeight, resizeWidth])

  useEffect(() => {
    invokeDesktopBridge(
      bridge,
      'setAlwaysOnTop',
      Boolean(preferences.alwaysOnTop),
      onBridgeError,
    )
  }, [bridge, onBridgeError, preferences.alwaysOnTop])

  const toggleExpanded = useCallback(() => {
    setExpanded((current) => !current)
  }, [])
  const openSettings = useCallback(() => {
    setExpanded(true)
    controller.actions.openSettings()
  }, [controller.actions])

  const openReleaseNotes = useCallback(() => {
    setExpanded(true)
    controller.actions.openReleaseNotes()
  }, [controller.actions])

  const toggleLocked = useCallback(() => {
    setPreferences((current) => ({ ...current, locked: !current.locked }))
  }, [setPreferences])

  const toggleAlwaysOnTop = useCallback(() => {
    setPreferences((current) => ({
      ...current,
      alwaysOnTop: !current.alwaysOnTop,
    }))
  }, [setPreferences])

  const selectSkin = useCallback((skinId) => {
    const selectedSkinId = desktopWidgetSkinRegistry.resolveId(skinId)
    setPreferences((current) => (
      current.selectedSkinId === selectedSkinId
        ? current
        : { ...current, selectedSkinId }
    ))
  }, [setPreferences])

  const selectScale = useCallback((scale) => {
    if (!DESKTOP_COMPACT_SCALES.has(scale)) return
    setPreferences((current) => (
      current.scale === scale ? current : { ...current, scale }
    ))
  }, [setPreferences])

  const skinActions = useMemo(() => ({
    toggleExpanded,
    toggleLeave: controller.actions.toggleLeave,
    openSettings,
    openReleaseNotes,
    toggleLocked,
  }), [controller.actions.toggleLeave, openReleaseNotes, openSettings, toggleExpanded, toggleLocked])

  const panelActions = useMemo(() => ({
    ...controller.actions,
    toggleExpanded,
    toggleLocked,
    toggleAlwaysOnTop,
    selectSkin,
    selectScale,
  }), [controller.actions, selectScale, selectSkin, toggleAlwaysOnTop, toggleExpanded, toggleLocked])

  return (
    <DesktopWidgetApp
      model={model}
      skin={skin}
      skins={skins}
      expanded={expanded}
      controller={controller}
      bridge={bridge}
      compactScale={compactScale}
      onBridgeError={onBridgeError}
      skinActions={skinActions}
      panelActions={panelActions}
    />
  )
}

export function resizeDesktopWindow(bridge, size, onBridgeError = () => {}) {
  invokeDesktopBridge(bridge, 'resizeWindow', size, onBridgeError)
}

export function invokeDesktopBridge(
  bridge,
  method,
  payload,
  onBridgeError = () => {},
) {
  if (typeof bridge?.[method] !== 'function') {
    reportBridgeError(
      onBridgeError,
      new TypeError(`desktopBridge.${method} is unavailable`),
    )
    return
  }

  try {
    const result = bridge[method](payload)
    if (result && typeof result.then === 'function') {
      void Promise.resolve(result).catch((error) => {
        reportBridgeError(onBridgeError, error)
      })
    }
  } catch (error) {
    reportBridgeError(onBridgeError, error)
  }
}

function reportBridgeError(onBridgeError, error) {
  try {
    onBridgeError(error)
  } catch {
    // Error reporting must not create another renderer failure.
  }
}
