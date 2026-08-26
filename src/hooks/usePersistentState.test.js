import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_CONVERSION_ITEMS, normalizeState } from './usePersistentState.js'

test('migrates legacy custom items after the editable presets', () => {
  const legacyItem = { id: 'legacy-item', name: '旧自定义项目', price: 88 }
  const state = normalizeState({ version: 1, customItems: [legacyItem] })

  assert.equal(state.conversionItems.length, DEFAULT_CONVERSION_ITEMS.length + 1)
  assert.deepEqual(state.conversionItems.at(-1), legacyItem)
  assert.equal('customItems' in state, false)
})

test('preserves an empty conversion list after all presets are deleted', () => {
  const state = normalizeState({ version: 1, conversionItems: [] })

  assert.deepEqual(state.conversionItems, [])
})

test('normalizes edited conversion item values from imported data', () => {
  const state = normalizeState({
    version: 1,
    conversionItems: [{ id: 7, name: '  通勤  ', price: '12.5' }],
  })

  assert.deepEqual(state.conversionItems, [{ id: '7', name: '通勤', price: 12.5 }])
})
