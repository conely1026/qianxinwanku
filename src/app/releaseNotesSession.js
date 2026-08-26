export function createReleaseNotesSession(unseenReleases) {
  if (!Array.isArray(unseenReleases)) {
    throw new TypeError('unseenReleases must be an array')
  }

  return {
    unseenReleases,
    dismissedForSession: false,
  }
}

export function isReleaseNotesOpen(session) {
  return session.unseenReleases.length > 0 && !session.dismissedForSession
}

export function dismissReleaseNotesForSession(session) {
  if (session.dismissedForSession) return session
  return { ...session, dismissedForSession: true }
}

export function reopenReleaseNotesForSession(session) {
  if (!session.dismissedForSession) return session
  return { ...session, dismissedForSession: false }
}

export function acknowledgeAllReleaseNotes(session) {
  if (!session.unseenReleases.length) return session
  return {
    unseenReleases: [],
    dismissedForSession: false,
  }
}
