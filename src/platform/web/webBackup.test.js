import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createWebBackupAdapter,
  createWebBackupFilename,
  WEB_BACKUP_ERROR_CODES,
  WebBackupError,
} from './webBackup.js'

function createExportHarness(overrides = {}) {
  const events = []

  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts
      this.options = options
      events.push(['blob', parts, options])
    }
  }

  const anchor = {
    href: '',
    download: '',
    click() {
      events.push(['click', this.href, this.download])
    },
    remove() {
      events.push(['remove'])
    },
  }

  const documentLike = {
    body: {
      appendChild(element) {
        events.push(['append', element])
      },
    },
    createElement(tagName) {
      events.push(['create-element', tagName])
      return anchor
    },
  }

  const urlApi = {
    createObjectURL(blob) {
      events.push(['create-url', blob])
      return 'blob:backup'
    },
    revokeObjectURL(url) {
      events.push(['revoke-url', url])
    },
  }

  return {
    adapter: createWebBackupAdapter({
      BlobCtor: FakeBlob,
      documentLike,
      urlApi,
      clock: () => new Date('2026-08-26T09:30:00Z'),
      ...overrides,
    }),
    anchor,
    events,
  }
}

test('exports formatted JSON with the existing stable UTC-date filename and cleans up', () => {
  const { adapter, anchor, events } = createExportHarness()

  const result = adapter.exportBackup({ version: 1, settings: { salary: 10000 } })

  assert.deepEqual(result, { filename: '千薪万苦-本地数据-2026-08-26.json' })
  assert.equal(anchor.href, 'blob:backup')
  assert.equal(anchor.download, result.filename)
  assert.deepEqual(events[0], [
    'blob',
    ['{\n  "version": 1,\n  "settings": {\n    "salary": 10000\n  }\n}'],
    { type: 'application/json' },
  ])
  assert.equal(events.some(([name]) => name === 'click'), true)
  assert.deepEqual(events.slice(-2), [['remove'], ['revoke-url', 'blob:backup']])
})

test('revokes the object URL even when the browser download click fails', () => {
  const { adapter, events } = createExportHarness({
    documentLike: {
      createElement() {
        return {
          click() {
            throw new Error('click failed')
          },
        }
      },
    },
  })

  assert.throws(() => adapter.exportBackup({ version: 1 }), /click failed/)
  assert.deepEqual(events.at(-1), ['revoke-url', 'blob:backup'])
})

test('imports a JSON object and reports malformed or incompatible content explicitly', async () => {
  const { adapter } = createExportHarness()

  await assert.doesNotReject(async () => {
    assert.deepEqual(
      await adapter.importBackup({ text: async () => '{"version":1}' }),
      { version: 1 },
    )
  })

  for (const content of ['{malformed', '[]', 'null']) {
    await assert.rejects(
      () => adapter.importBackup({ text: async () => content }),
      (error) => error instanceof WebBackupError
        && error.code === WEB_BACKUP_ERROR_CODES.INVALID_FILE,
    )
  }
})

test('reports missing browser export and file-reading capabilities', async () => {
  const exportAdapter = createWebBackupAdapter({
    BlobCtor: undefined,
    urlApi: undefined,
    documentLike: undefined,
  })

  assert.throws(
    () => exportAdapter.exportBackup({ version: 1 }),
    (error) => error instanceof WebBackupError
      && error.code === WEB_BACKUP_ERROR_CODES.EXPORT_UNAVAILABLE,
  )

  await assert.rejects(
    () => exportAdapter.importBackup({}),
    (error) => error instanceof WebBackupError
      && error.code === WEB_BACKUP_ERROR_CODES.IMPORT_UNAVAILABLE,
  )
})

test('reports serialization failures without creating a download URL', () => {
  const { adapter, events } = createExportHarness({
    serialize() {
      throw new Error('cyclic data')
    },
  })

  assert.throws(
    () => adapter.exportBackup({}),
    (error) => error instanceof WebBackupError
      && error.code === WEB_BACKUP_ERROR_CODES.SERIALIZE_FAILED
      && error.cause?.message === 'cyclic data',
  )
  assert.equal(events.length, 0)
})

test('requires a valid date when building a backup filename', () => {
  assert.equal(
    createWebBackupFilename(new Date('2026-01-02T12:00:00Z')),
    '千薪万苦-本地数据-2026-01-02.json',
  )
  assert.equal(
    createWebBackupFilename(new Date('2026-08-26T00:30:00+08:00')),
    '千薪万苦-本地数据-2026-08-25.json',
  )
  assert.throws(() => createWebBackupFilename(new Date('invalid')), TypeError)
})
