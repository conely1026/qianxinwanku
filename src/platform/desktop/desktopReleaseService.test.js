import test from 'node:test'
import assert from 'node:assert/strict'
import { RELEASE_CHANNELS } from '../../lib/releaseNotes.js'
import { createDesktopReleaseService } from './desktopReleaseService.js'

const releases = [
  { id: 'web-only', channel: RELEASE_CHANNELS.WEB, highlights: [] },
  { id: 'shared', channel: RELEASE_CHANNELS.ALL, highlights: [] },
  { id: 'desktop-only', channel: RELEASE_CHANNELS.DESKTOP, highlights: [] },
]

test('desktop release service filters channels and persists the latest desktop release id', () => {
  const seen = []
  const service = createDesktopReleaseService({
    lastSeenReleaseId: 'shared',
    markReleaseSeen: (releaseId) => seen.push(releaseId),
    releases,
  })

  assert.deepEqual(service.readUnseenReleases().map((release) => release.id), ['desktop-only'])
  assert.equal(service.markCurrentReleaseSeen(), true)
  assert.deepEqual(seen, ['desktop-only'])
})

test('fresh desktop installs show only the current eligible release', () => {
  const service = createDesktopReleaseService({ releases })
  assert.deepEqual(service.readUnseenReleases().map((release) => release.id), ['desktop-only'])
  assert.equal(service.markCurrentReleaseSeen(), false)
})
