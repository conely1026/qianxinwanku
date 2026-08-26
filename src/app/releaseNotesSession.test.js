import test from 'node:test'
import assert from 'node:assert/strict'
import {
  acknowledgeAllReleaseNotes,
  createReleaseNotesSession,
  dismissReleaseNotesForSession,
  isReleaseNotesOpen,
  reopenReleaseNotesForSession,
} from './releaseNotesSession.js'

test('dismissing release notes only hides them for the current session', () => {
  const unseenReleases = [{ id: 'release-1' }, { id: 'release-2' }]
  const initial = createReleaseNotesSession(unseenReleases)
  const dismissed = dismissReleaseNotesForSession(initial)

  assert.equal(isReleaseNotesOpen(initial), true)
  assert.equal(isReleaseNotesOpen(dismissed), false)
  assert.equal(dismissed.unseenReleases, unseenReleases)
  assert.deepEqual(dismissed.unseenReleases, unseenReleases)
})

test('the unread entry can reopen dismissed release notes without changing unread data', () => {
  const unseenReleases = [{ id: 'release-1' }]
  const dismissed = dismissReleaseNotesForSession(createReleaseNotesSession(unseenReleases))
  const reopened = reopenReleaseNotesForSession(dismissed)

  assert.equal(isReleaseNotesOpen(reopened), true)
  assert.equal(reopened.unseenReleases, unseenReleases)
})

test('acknowledging clears all current unread releases and closes the dialog', () => {
  const session = createReleaseNotesSession([{ id: 'release-1' }, { id: 'release-2' }])
  const acknowledged = acknowledgeAllReleaseNotes(session)

  assert.deepEqual(acknowledged.unseenReleases, [])
  assert.equal(isReleaseNotesOpen(acknowledged), false)
})

test('a session without unread releases starts closed', () => {
  assert.equal(isReleaseNotesOpen(createReleaseNotesSession([])), false)
})
