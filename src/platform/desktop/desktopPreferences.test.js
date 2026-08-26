import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_DESKTOP_WIDGET_SKIN_ID } from '../../features/desktop-widget/skins/skinRegistry.js'
import {
  DEFAULT_DESKTOP_PREFERENCES,
  DESKTOP_PREFERENCES_SCHEMA_VERSION,
  normalizeDesktopPreferences,
} from './desktopPreferences.js'

test('desktop preferences stay separate from AppState and preserve valid window choices', () => {
  const preferences = normalizeDesktopPreferences({
    schemaVersion: DESKTOP_PREFERENCES_SCHEMA_VERSION,
    selectedSkinId: 'office-cat',
    scale: 1.5,
    alwaysOnTop: false,
    locked: true,
    closeBehavior: 'quit',
    windowBounds: { x: 20, y: 40, width: 320, height: 240 },
    lastSeenReleaseId: '2026-08-26-03',
  })

  assert.deepEqual(preferences, {
    schemaVersion: 1,
    selectedSkinId: 'office-cat',
    scale: 1.5,
    alwaysOnTop: false,
    locked: true,
    closeBehavior: 'quit',
    windowBounds: { x: 20, y: 40, width: 320, height: 240 },
    lastSeenReleaseId: '2026-08-26-03',
  })
})

test('unknown skins fall back through the registry resolver without touching business data', () => {
  const preferences = normalizeDesktopPreferences({
    ...DEFAULT_DESKTOP_PREFERENCES,
    selectedSkinId: 'removed-skin',
  }, {
    resolveSkinId: (id) => (id === 'office-cat' ? id : DEFAULT_DESKTOP_WIDGET_SKIN_ID),
  })

  assert.equal(preferences.selectedSkinId, DEFAULT_DESKTOP_WIDGET_SKIN_ID)
  assert.equal('settings' in preferences, false)
  assert.equal('leaveSession' in preferences, false)
})

test('invalid preference versions and unsafe values use stable defaults', () => {
  assert.equal(normalizeDesktopPreferences({ schemaVersion: 2 }), DEFAULT_DESKTOP_PREFERENCES)

  const preferences = normalizeDesktopPreferences({
    schemaVersion: 1,
    selectedSkinId: 7,
    scale: 1.3,
    alwaysOnTop: 'yes',
    locked: null,
    closeBehavior: 'delete',
    windowBounds: { x: 0, y: 0, width: -1, height: 50 },
  })

  assert.deepEqual(preferences, DEFAULT_DESKTOP_PREFERENCES)
})
