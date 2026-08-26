import test from 'node:test'
import assert from 'node:assert/strict'
import {
  confirmDesktopDataReset,
  notifyDesktopActionError,
} from './desktopAppActions.js'

test('desktop reset and error prompts stay behind platform helpers', () => {
  const prompts = []
  assert.equal(confirmDesktopDataReset((message) => {
    prompts.push(message)
    return true
  }), true)

  const error = new Error('failed')
  assert.equal(notifyDesktopActionError(error, (message) => prompts.push(message)), error)
  assert.equal(prompts.length, 2)
})
