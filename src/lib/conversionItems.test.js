import test from 'node:test'
import assert from 'node:assert/strict'
import { appendConversionItem, removeConversionItem, replaceConversionItem } from './conversionItems.js'

const items = [
  { id: 'coffee', name: '一杯咖啡', price: 15 },
  { id: 'lunch', name: '一顿午饭', price: 35 },
]

test('adds a conversion item without mutating the current list', () => {
  const next = appendConversionItem(items, { id: 'movie', name: '电影票', price: 55 })

  assert.equal(items.length, 2)
  assert.equal(next.length, 3)
})

test('replaces the matching preset and preserves the other items', () => {
  const next = replaceConversionItem(items, { id: 'coffee', name: '精品咖啡', price: 18 })

  assert.deepEqual(next, [
    { id: 'coffee', name: '精品咖啡', price: 18 },
    items[1],
  ])
})

test('removes only the confirmed conversion item', () => {
  const next = removeConversionItem(items, 'coffee')

  assert.deepEqual(next, [items[1]])
})
