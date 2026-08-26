import {
  getLatestRelease,
  getUnseenReleases,
  RELEASE_CHANNELS,
  RELEASE_HISTORY,
} from '../../lib/releaseNotes.js'

export function createDesktopReleaseService({
  lastSeenReleaseId,
  markReleaseSeen,
  releases = RELEASE_HISTORY,
} = {}) {
  const currentRelease = getLatestRelease({
    releases,
    channel: RELEASE_CHANNELS.DESKTOP,
  })

  return Object.freeze({
    readUnseenReleases() {
      return getUnseenReleases(lastSeenReleaseId, {
        releases,
        channel: RELEASE_CHANNELS.DESKTOP,
      })
    },
    markCurrentReleaseSeen() {
      if (!currentRelease || typeof markReleaseSeen !== 'function') return false
      markReleaseSeen(currentRelease.id)
      return true
    },
  })
}
