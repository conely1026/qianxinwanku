import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createDesktopBackupAdapter,
  DESKTOP_BACKUP_ERROR_CODES,
  DesktopBackupError,
} from './desktopBackup.js'

test('desktop backup adapter delegates export and unwraps imported data', async () => {
  const calls = []
  const data = { schemaVersion: 1 }
  const adapter = createDesktopBackupAdapter({
    async exportBackup(value) {
      calls.push(['export', value])
      return { canceled: false, filename: 'backup.json' }
    },
    async importBackup() {
      calls.push(['import'])
      return { canceled: false, data }
    },
  })

  assert.deepEqual(await adapter.exportBackup(data), { canceled: false, filename: 'backup.json' })
  assert.equal(await adapter.importBackup(), data)
  assert.deepEqual(calls, [['export', data], ['import']])
})

test('desktop backup adapter preserves cancel and rejects missing bridge methods', async () => {
  const canceled = createDesktopBackupAdapter({
    async importBackup() { return { canceled: true } },
  })
  assert.equal(await canceled.importBackup(), null)

  await assert.rejects(
    createDesktopBackupAdapter({}).exportBackup({}),
    (error) => error instanceof DesktopBackupError
      && error.code === DESKTOP_BACKUP_ERROR_CODES.BRIDGE_UNAVAILABLE,
  )
})
