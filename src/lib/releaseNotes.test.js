import test from 'node:test'
import assert from 'node:assert/strict'
import { CURRENT_RELEASE, shouldShowReleaseNotes } from './releaseNotes.js'

test('shows release notes when no release has been seen', () => {
  assert.equal(shouldShowReleaseNotes(null), true)
})

test('shows release notes when the release id changes', () => {
  assert.equal(shouldShowReleaseNotes('2026-08-25-01'), true)
})

test('does not repeat release notes after the current release is seen', () => {
  assert.equal(shouldShowReleaseNotes(CURRENT_RELEASE.id), false)
})
