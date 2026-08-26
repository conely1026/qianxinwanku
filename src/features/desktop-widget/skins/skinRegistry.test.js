import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createDesktopWidgetSkinRegistry,
  DEFAULT_DESKTOP_WIDGET_SKIN_ID,
  defineDesktopWidgetSkin,
} from './skinRegistry.js'

function CapsuleView() {}
function OfficeCatView() {}

const capsule = {
  id: DEFAULT_DESKTOP_WIDGET_SKIN_ID,
  version: 1,
  displayName: '极简胶囊',
  compactSize: { width: 360, height: 76 },
  CompactView: CapsuleView,
}

test('registers built-in skins and falls back from unknown or removed ids', () => {
  const registry = createDesktopWidgetSkinRegistry([
    capsule,
    {
      id: 'office-cat',
      version: 1,
      displayName: '小猫上班',
      compactSize: { width: 320, height: 240 },
      CompactView: OfficeCatView,
    },
  ])

  assert.equal(registry.resolve('office-cat').CompactView, OfficeCatView)
  assert.equal(registry.resolve('removed-skin').id, DEFAULT_DESKTOP_WIDGET_SKIN_ID)
  assert.equal(registry.resolveId('removed-skin'), DEFAULT_DESKTOP_WIDGET_SKIN_ID)
  assert.deepEqual(registry.list().map((skin) => skin.id), ['capsule', 'office-cat'])
})

test('rejects duplicate, executable-free-contract violations and missing fallback skins', () => {
  assert.throws(
    () => createDesktopWidgetSkinRegistry([capsule, capsule]),
    /duplicate desktop widget skin id/,
  )
  assert.throws(
    () => createDesktopWidgetSkinRegistry([{ ...capsule, id: 'office-cat' }]),
    /missing fallback desktop widget skin/,
  )
  assert.throws(
    () => defineDesktopWidgetSkin({ ...capsule, id: '../external' }),
    /stable id/,
  )
  assert.throws(
    () => defineDesktopWidgetSkin({ ...capsule, compactSize: { width: 0, height: 90 } }),
    /positive compactSize/,
  )
  assert.throws(
    () => defineDesktopWidgetSkin({ ...capsule, CompactView: './skin.js' }),
    /CompactView component/,
  )
})
