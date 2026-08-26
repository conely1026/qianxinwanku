import {
  getLatestRelease,
  getUnseenReleases,
  RELEASE_CHANNELS,
  RELEASE_HISTORY,
  WEB_RELEASE_SEEN_STORAGE_KEY,
} from '../../lib/releaseNotes.js'
import { STORAGE_KEY } from './webStateStorage.js'

export function createWebReleaseService({
  storage,
  stateStorageKey = STORAGE_KEY,
  releaseSeenStorageKey = WEB_RELEASE_SEEN_STORAGE_KEY,
  releases = RELEASE_HISTORY,
} = {}) {
  const currentWebRelease = getLatestRelease({ releases, channel: RELEASE_CHANNELS.WEB })

  function getStorage() {
    return storage ?? globalThis.window?.localStorage
  }

  function readUnseenReleases() {
    try {
      const targetStorage = getStorage()
      if (!targetStorage) return currentWebRelease ? [currentWebRelease] : []
      const lastSeenReleaseId = targetStorage?.getItem(releaseSeenStorageKey)
      const hasExistingAppData = targetStorage?.getItem(stateStorageKey) !== null
      return getUnseenReleases(lastSeenReleaseId, {
        releases,
        channel: RELEASE_CHANNELS.WEB,
        includeAllWhenUnseen: hasExistingAppData,
      })
    } catch {
      return currentWebRelease ? [currentWebRelease] : []
    }
  }

  function markCurrentReleaseSeen() {
    try {
      const targetStorage = getStorage()
      if (!targetStorage || !currentWebRelease) return false
      targetStorage.setItem(releaseSeenStorageKey, currentWebRelease.id)
      return true
    } catch {
      return false
    }
  }

  return { readUnseenReleases, markCurrentReleaseSeen }
}

export const webReleaseService = createWebReleaseService()
