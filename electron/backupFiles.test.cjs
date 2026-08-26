const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const {
  createDesktopBackupFilename,
  readDesktopBackup,
  writeDesktopBackup,
} = require('./backupFiles.cjs')

const state = {
  schemaVersion: 1,
  settings: {},
  conversionItems: [],
  attendance: {},
  leaveSession: {},
  headphone: {},
  lastView: 'today',
}

test('desktop backup filename and JSON round trip stay deterministic', async () => {
  assert.equal(
    createDesktopBackupFilename(new Date('2026-08-26T12:00:00.000Z')),
    '千薪万苦-桌面备份-2026-08-26.json',
  )

  let stored = ''
  const fileSystem = {
    async writeFile(_filePath, content) { stored = content },
    async readFile() { return stored },
  }
  const filePath = path.resolve('backup.json')
  assert.equal(await writeDesktopBackup(filePath, state, fileSystem), 'backup.json')
  assert.deepEqual(await readDesktopBackup(filePath, fileSystem), state)
})

test('desktop backup rejects unsafe roots and invalid current exports', async () => {
  const filePath = path.resolve('backup.json')
  await assert.rejects(
    readDesktopBackup(filePath, { async readFile() { return '[]' } }),
    /root must be an object/,
  )
  await assert.rejects(
    writeDesktopBackup(filePath, { schemaVersion: 9 }, { async writeFile() {} }),
    /unsupported field|current version/,
  )
})
