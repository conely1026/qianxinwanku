import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  alertInvalidWebBackup,
  confirmWebDataReset,
  importWebBackup,
  INVALID_BACKUP_ALERT,
  RESET_CONFIRMATION,
  scrollWebToTop,
  WEB_RELEASE_STORAGE_NOTE,
  WEB_STORAGE_DESCRIPTION,
} from './webAppActions.js'
import {
  WEB_BACKUP_ERROR_CODES,
  WebBackupError,
} from './webBackup.js'
import {
  registerWebServiceWorker,
  setWebDocumentTitle,
} from './useWebAppEffects.js'

test('Web reset confirmation and scroll adapters preserve the existing browser interaction', () => {
  const calls = []
  const windowObject = {
    confirm(message) {
      calls.push(['confirm', message])
      return true
    },
    scrollTo(options) {
      calls.push(['scrollTo', options])
    },
  }

  assert.equal(confirmWebDataReset(windowObject), true)
  scrollWebToTop(windowObject)
  assert.deepEqual(calls, [
    ['confirm', RESET_CONFIRMATION],
    ['scrollTo', { top: 0, behavior: 'smooth' }],
  ])
})

test('Web backup import delegates parsed data and maps known file errors to the invalid alert', async () => {
  const imported = []
  const alerts = []
  const windowObject = {
    alert(message) {
      alerts.push(message)
    },
  }
  const validAdapter = {
    async importBackup(file) {
      assert.equal(file.name, 'backup.json')
      return { settings: { salary: 10000 } }
    },
  }

  assert.equal(await importWebBackup(
    { name: 'backup.json' },
    {
      backupAdapter: validAdapter,
      onImport: (data) => imported.push(data),
      onInvalidFile: () => alertInvalidWebBackup(windowObject),
    },
  ), true)
  assert.deepEqual(imported, [{ settings: { salary: 10000 } }])
  assert.deepEqual(alerts, [])

  assert.equal(await importWebBackup(
    { name: 'broken.json' },
    {
      backupAdapter: {
        importBackup: async () => {
          throw new WebBackupError(
            WEB_BACKUP_ERROR_CODES.INVALID_FILE,
            'invalid backup',
          )
        },
      },
      onImport: (data) => imported.push(data),
      onInvalidFile: () => alertInvalidWebBackup(windowObject),
    },
  ), false)
  assert.deepEqual(imported, [{ settings: { salary: 10000 } }])
  assert.deepEqual(alerts, [INVALID_BACKUP_ALERT])
})

test('Web backup import maps a rejected app schema to invalid without replacing data', async () => {
  const events = []

  assert.equal(await importWebBackup(
    { name: 'incomplete.json' },
    {
      backupAdapter: { importBackup: async () => ({ version: 1 }) },
      onImport: () => {
        events.push('on-import')
        return false
      },
      onInvalidFile: () => events.push('invalid'),
    },
  ), false)
  assert.deepEqual(events, ['on-import', 'invalid'])
})

test('Web backup import propagates unavailable import capability without showing invalid alert', async () => {
  const events = []

  await assert.rejects(
    () => importWebBackup(
      { name: 'backup.json' },
      {
        backupAdapter: {
          importBackup: async () => {
            throw new WebBackupError(
              WEB_BACKUP_ERROR_CODES.IMPORT_UNAVAILABLE,
              'import unavailable',
            )
          },
        },
        onImport: () => events.push('on-import'),
        onInvalidFile: () => events.push('invalid'),
      },
    ),
    (error) => error instanceof WebBackupError
      && error.code === WEB_BACKUP_ERROR_CODES.IMPORT_UNAVAILABLE,
  )
  assert.deepEqual(events, [])
})

test('Web backup import propagates unknown adapter and app errors without showing invalid alert', async () => {
  const events = []

  await assert.rejects(
    () => importWebBackup(
      { name: 'adapter-error.json' },
      {
        backupAdapter: { importBackup: async () => { throw new Error('adapter failed') } },
        onImport: () => events.push('on-import'),
        onInvalidFile: () => events.push('invalid'),
      },
    ),
    /adapter failed/,
  )
  assert.deepEqual(events, [])

  await assert.rejects(
    () => importWebBackup(
      { name: 'app-error.json' },
      {
        backupAdapter: { importBackup: async () => ({ version: 1 }) },
        onImport: () => { throw new Error('app failed') },
        onInvalidFile: () => events.push('invalid'),
      },
    ),
    /app failed/,
  )
  assert.deepEqual(events, [])
})

test('Profile feature remains platform-neutral while the Web shell injects backup capabilities', () => {
  const profileSource = readFileSync(new URL('../../views/ProfileView.jsx', import.meta.url), 'utf8')
  const importActionSource = readFileSync(new URL('./WebBackupImportAction.jsx', import.meta.url), 'utf8')
  const appSource = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8')

  for (const forbidden of ['new Blob', 'URL.createObjectURL', 'document.createElement', 'window.alert', 'file.text', 'localStorage']) {
    assert.equal(profileSource.includes(forbidden), false, `ProfileView must not contain ${forbidden}`)
  }
  for (const forbidden of ['type="file"', 'document', 'window', 'localStorage']) {
    assert.equal(profileSource.includes(forbidden), false, `ProfileView must not contain ${forbidden}`)
  }
  assert.match(importActionSource, /finally\s*{\s*input\.value = ''\s*}/)
  assert.match(appSource, /backupAdapter:\s*webBackupAdapter/)
  assert.match(appSource, /onInvalidFile:\s*alertInvalidWebBackup/)
  assert.match(appSource, /storageDescription={WEB_STORAGE_DESCRIPTION}/)
  assert.match(appSource, /storageNote={WEB_RELEASE_STORAGE_NOTE}/)
  assert.equal(WEB_STORAGE_DESCRIPTION.includes('localStorage'), true)
  assert.equal(WEB_RELEASE_STORAGE_NOTE.includes('浏览器'), true)
})

test('shared conversion and modal features receive platform capabilities from the Web shell', () => {
  const convertSource = readFileSync(new URL('../../views/ConvertView.jsx', import.meta.url), 'utf8')
  const settingsSource = readFileSync(new URL('../../components/SettingsModal.jsx', import.meta.url), 'utf8')
  const releaseSource = readFileSync(new URL('../../components/ReleaseNotesModal.jsx', import.meta.url), 'utf8')
  const appSource = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8')

  for (const source of [convertSource, settingsSource, releaseSource]) {
    for (const forbidden of ['crypto.randomUUID', 'document.body', 'window.addEventListener']) {
      assert.equal(source.includes(forbidden), false, `shared source must not contain ${forbidden}`)
    }
  }

  assert.match(convertSource, /onAddItem\(item\)/)
  assert.match(appSource, /idFactory: webIdFactory/)
  assert.match(appSource, /modalTarget={globalThis\.document\?\.body}/)
  assert.match(appSource, /keyboardTarget={globalThis\.window}/)
})

test('Web shell effects keep the current title and service worker path', () => {
  const registrations = []
  const navigatorObject = {
    serviceWorker: {
      register(path) {
        registrations.push(path)
        return Promise.resolve()
      },
    },
  }
  const documentObject = { title: '' }

  registerWebServiceWorker(navigatorObject)
  setWebDocumentTitle('calendar', documentObject)

  assert.deepEqual(registrations, ['./sw.js'])
  assert.equal(documentObject.title, '日历 · 千薪万苦')
})
