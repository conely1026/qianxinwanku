import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('release dialog keeps dismiss and acknowledge as separate component commands', () => {
  const modalSource = readFileSync(new URL('./ReleaseNotesModal.jsx', import.meta.url), 'utf8')
  const appSource = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')
  const controllerSource = readFileSync(new URL('../app/useAppController.js', import.meta.url), 'utf8')

  assert.match(modalSource, /aria-label="关闭更新说明" onClick={onDismiss}/)
  assert.match(modalSource, /onClick={onAcknowledge}>知道了<\/button>/)
  assert.match(modalSource, /aria-label="上一条更新"/)
  assert.match(modalSource, /aria-label="下一条更新"/)

  assert.match(appSource, /onDismiss={actions\.dismissReleaseNotes}/)
  assert.match(appSource, /onAcknowledge={actions\.acknowledgeReleaseNotes}/)
  assert.match(appSource, /aria-label={`查看 \$\{unseenReleases\.length\} 条未读更新`}/)

  const dismissCommand = controllerSource.slice(
    controllerSource.indexOf('const dismissReleaseNotes'),
    controllerSource.indexOf('const openReleaseNotes'),
  )
  const acknowledgeCommand = controllerSource.slice(
    controllerSource.indexOf('const acknowledgeReleaseNotes'),
    controllerSource.indexOf('const resetData'),
  )

  assert.equal(dismissCommand.includes('markCurrentReleaseSeen'), false)
  assert.equal(acknowledgeCommand.includes('markCurrentReleaseSeen'), true)
})
