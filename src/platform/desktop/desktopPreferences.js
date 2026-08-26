import { DEFAULT_DESKTOP_WIDGET_SKIN_ID } from '../../features/desktop-widget/skins/skinRegistry.js'

export const DESKTOP_PREFERENCES_SCHEMA_VERSION = 1

export const DEFAULT_DESKTOP_PREFERENCES = Object.freeze({
  schemaVersion: DESKTOP_PREFERENCES_SCHEMA_VERSION,
  selectedSkinId: DEFAULT_DESKTOP_WIDGET_SKIN_ID,
  scale: 1,
  alwaysOnTop: true,
  locked: false,
  closeBehavior: 'hide',
  windowBounds: null,
  lastSeenReleaseId: null,
})

const ALLOWED_SCALES = new Set([1, 1.25, 1.5, 2])
const ALLOWED_CLOSE_BEHAVIORS = new Set(['hide', 'quit'])

function normalizeWindowBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') return null
  const { x, y, width, height } = bounds
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null
  return { x, y, width, height }
}

export function normalizeDesktopPreferences(value, { resolveSkinId } = {}) {
  if (
    !value
    || typeof value !== 'object'
    || value.schemaVersion !== DESKTOP_PREFERENCES_SCHEMA_VERSION
  ) {
    return DEFAULT_DESKTOP_PREFERENCES
  }

  const requestedSkinId = typeof value.selectedSkinId === 'string'
    ? value.selectedSkinId
    : DEFAULT_DESKTOP_WIDGET_SKIN_ID
  const selectedSkinId = typeof resolveSkinId === 'function'
    ? resolveSkinId(requestedSkinId)
    : requestedSkinId

  return {
    schemaVersion: DESKTOP_PREFERENCES_SCHEMA_VERSION,
    selectedSkinId,
    scale: ALLOWED_SCALES.has(value.scale) ? value.scale : DEFAULT_DESKTOP_PREFERENCES.scale,
    alwaysOnTop: typeof value.alwaysOnTop === 'boolean'
      ? value.alwaysOnTop
      : DEFAULT_DESKTOP_PREFERENCES.alwaysOnTop,
    locked: typeof value.locked === 'boolean' ? value.locked : DEFAULT_DESKTOP_PREFERENCES.locked,
    closeBehavior: ALLOWED_CLOSE_BEHAVIORS.has(value.closeBehavior)
      ? value.closeBehavior
      : DEFAULT_DESKTOP_PREFERENCES.closeBehavior,
    windowBounds: normalizeWindowBounds(value.windowBounds),
    lastSeenReleaseId: typeof value.lastSeenReleaseId === 'string' && value.lastSeenReleaseId
      ? value.lastSeenReleaseId
      : null,
  }
}
