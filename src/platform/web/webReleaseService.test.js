import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DESKTOP_RELEASE_SEEN_STORAGE_KEY,
  getLatestRelease,
  getUnseenReleases,
  RELEASE_CHANNELS,
  RELEASE_SEEN_STORAGE_KEY,
  WEB_RELEASE_SEEN_STORAGE_KEY,
} from '../../lib/releaseNotes.js'
import { STORAGE_KEY } from './webStateStorage.js'
import { createWebReleaseService } from './webReleaseService.js'

const CURRENT_WEB_RELEASE = getLatestRelease({ channel: RELEASE_CHANNELS.WEB })
const WEB_RELEASE_HISTORY = getUnseenReleases(null, {
  channel: RELEASE_CHANNELS.WEB,
  includeAllWhenUnseen: true,
})

function createMemoryStorage(entries = []) {
  const values = new Map(entries)
  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('existing Web users receive all unseen releases and keep the release key unchanged', () => {
  const storage = createMemoryStorage([[STORAGE_KEY, '{}']])
  const service = createWebReleaseService({ storage })

  assert.deepEqual(service.readUnseenReleases(), WEB_RELEASE_HISTORY)
  assert.equal(service.markCurrentReleaseSeen(), true)
  assert.equal(storage.getItem(RELEASE_SEEN_STORAGE_KEY), CURRENT_WEB_RELEASE.id)
  assert.deepEqual(service.readUnseenReleases(), [])
})

test('new users and unavailable storage only receive the current release', () => {
  const service = createWebReleaseService({ storage: createMemoryStorage() })
  assert.deepEqual(service.readUnseenReleases(), [CURRENT_WEB_RELEASE])

  const unavailable = createWebReleaseService({
    storage: {
      getItem() {
        throw new Error('unavailable')
      },
      setItem() {
        throw new Error('unavailable')
      },
    },
  })
  assert.deepEqual(unavailable.readUnseenReleases(), [CURRENT_WEB_RELEASE])
  assert.equal(unavailable.markCurrentReleaseSeen(), false)
})

test('Web filtering and acknowledgement ignore a newer Desktop-only release', () => {
  const releases = [
    { id: 'web-1', channel: 'web' },
    { id: 'shared-1', channel: 'all' },
    { id: 'desktop-1', channel: 'desktop' },
  ]
  const storage = createMemoryStorage([
    [STORAGE_KEY, '{}'],
    [DESKTOP_RELEASE_SEEN_STORAGE_KEY, 'desktop-old'],
  ])
  const service = createWebReleaseService({ storage, releases })

  assert.deepEqual(service.readUnseenReleases(), releases.slice(0, 2))
  assert.equal(service.markCurrentReleaseSeen(), true)
  assert.equal(storage.getItem(WEB_RELEASE_SEEN_STORAGE_KEY), 'shared-1')
  assert.equal(storage.getItem(DESKTOP_RELEASE_SEEN_STORAGE_KEY), 'desktop-old')
  assert.deepEqual(service.readUnseenReleases(), [])
})
