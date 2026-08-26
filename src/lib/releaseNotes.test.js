import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CURRENT_RELEASE,
  DESKTOP_RELEASE_SEEN_STORAGE_KEY,
  getLatestRelease,
  getUnseenReleases,
  RELEASE_HISTORY,
  shouldShowReleaseNotes,
  WEB_RELEASE_SEEN_STORAGE_KEY,
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
    { id: 'release-1', channel: 'all' },
    { id: 'release-2', channel: 'all' },
    { id: 'release-3', channel: 'all' },
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

test('filters all, Web and Desktop releases without changing chronological order', () => {
  const releases = [
    { id: 'web-1', channel: 'web' },
    { id: 'shared-1', channel: 'all' },
    { id: 'desktop-1', channel: 'desktop' },
    { id: 'web-2', channel: 'web' },
  ]

  assert.deepEqual(
    getUnseenReleases(null, { releases, channel: 'web', includeAllWhenUnseen: true }),
    [releases[0], releases[1], releases[3]],
  )
  assert.deepEqual(
    getUnseenReleases(null, { releases, channel: 'desktop', includeAllWhenUnseen: true }),
    [releases[1], releases[2]],
  )
  assert.deepEqual(
    getUnseenReleases(null, { releases, channel: 'all', includeAllWhenUnseen: true }),
    [releases[1]],
  )
  assert.deepEqual(
    getUnseenReleases('shared-1', { releases, channel: 'web' }),
    [releases[3]],
  )
  assert.deepEqual(
    getUnseenReleases('shared-1', { releases, channel: 'desktop' }),
    [releases[2]],
  )
})

test('returns the latest release eligible for the requested channel', () => {
  const releases = [
    { id: 'web-1', channel: 'web' },
    { id: 'shared-1', channel: 'all' },
    { id: 'desktop-1', channel: 'desktop' },
  ]

  assert.equal(getLatestRelease({ releases, channel: 'web' }), releases[1])
  assert.equal(getLatestRelease({ releases, channel: 'desktop' }), releases[2])
  assert.equal(getLatestRelease({ releases: [], channel: 'web' }), null)
})

test('keeps Web and Desktop seen markers in separate storage keys', () => {
  assert.notEqual(WEB_RELEASE_SEEN_STORAGE_KEY, DESKTOP_RELEASE_SEEN_STORAGE_KEY)
})
