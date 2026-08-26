import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CURRENT_RELEASE,
  getUnseenReleases,
  RELEASE_HISTORY,
  shouldShowReleaseNotes,
} from './releaseNotes.js'

test('shows only the latest release to a new user', () => {
  assert.deepEqual(getUnseenReleases(null), [CURRENT_RELEASE])
})

test('shows the full retained history to an existing user without a seen marker', () => {
  assert.deepEqual(
    getUnseenReleases(null, { includeAllWhenUnseen: true }),
    RELEASE_HISTORY,
  )
})

test('returns every release after the last seen release in chronological order', () => {
  const releases = [
    { id: 'release-1' },
    { id: 'release-2' },
    { id: 'release-3' },
  ]

  assert.deepEqual(
    getUnseenReleases('release-1', { releases }),
    releases.slice(1),
  )
})

test('falls back to the latest release when an old marker is no longer retained', () => {
  assert.deepEqual(getUnseenReleases('unknown-release'), [CURRENT_RELEASE])
})

test('does not repeat release notes after the current release is seen', () => {
  assert.deepEqual(getUnseenReleases(CURRENT_RELEASE.id), [])
  assert.equal(shouldShowReleaseNotes(CURRENT_RELEASE.id), false)
})
