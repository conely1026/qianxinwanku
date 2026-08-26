import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_CONVERSION_ITEMS,
  normalizeState,
} from '../platform/web/useWebPersistentState.js'

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

test('Hook persistence is driven by pending local writes instead of mount data', () => {
  const source = readFileSync(new URL('./usePersistentState.js', import.meta.url), 'utf8')

  assert.match(source, /if \(!pendingWrite \|\| lastEnqueuedWrite\.current === pendingWrite\) return/)
  assert.match(source, /writeQueue\.enqueue\(pendingWrite\.data\)/)
  assert.match(source, /\.catch\(\(error\) =>/)
  assert.match(source, /reportPersistentWriteError\(storage, error\)/)
  assert.doesNotMatch(source, /storage\.write\(snapshot\.data\)/)
  assert.match(source, /return \[snapshot\.data, setData, replaceData\]/)
})
