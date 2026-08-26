const BACKUP_FILE_PREFIX = '千薪万苦-本地数据'

export const WEB_BACKUP_ERROR_CODES = Object.freeze({
  EXPORT_UNAVAILABLE: 'WEB_BACKUP_EXPORT_UNAVAILABLE',
  SERIALIZE_FAILED: 'WEB_BACKUP_SERIALIZE_FAILED',
  IMPORT_UNAVAILABLE: 'WEB_BACKUP_IMPORT_UNAVAILABLE',
  INVALID_FILE: 'WEB_BACKUP_INVALID_FILE',
})

export class WebBackupError extends Error {
  constructor(code, message, options) {
    super(message, options)
    this.name = 'WebBackupError'
    this.code = code
  }
}

export function createWebBackupFilename(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('A valid Date is required to create a backup filename.')
  }

  const utcDate = date.toISOString().slice(0, 10)
  return `${BACKUP_FILE_PREFIX}-${utcDate}.json`
}

export function createWebBackupAdapter({
  BlobCtor = globalThis.Blob,
  urlApi = globalThis.URL,
  documentLike = globalThis.document,
  clock = () => new Date(),
  serialize = (data) => JSON.stringify(data, null, 2),
} = {}) {
  function exportBackup(data) {
    if (
      typeof BlobCtor !== 'function'
      || typeof urlApi?.createObjectURL !== 'function'
      || typeof urlApi?.revokeObjectURL !== 'function'
      || typeof documentLike?.createElement !== 'function'
    ) {
      throw new WebBackupError(
        WEB_BACKUP_ERROR_CODES.EXPORT_UNAVAILABLE,
        'Web backup export is unavailable in this environment.',
      )
    }

    let json
    let filename
    try {
      json = serialize(data)
      filename = createWebBackupFilename(clock())
    } catch (cause) {
      throw new WebBackupError(
        WEB_BACKUP_ERROR_CODES.SERIALIZE_FAILED,
        'The backup data could not be serialized.',
        { cause },
      )
    }

    const blob = new BlobCtor([json], { type: 'application/json' })
    const objectUrl = urlApi.createObjectURL(blob)
    let anchor

    try {
      anchor = documentLike.createElement('a')
      if (typeof anchor?.click !== 'function') {
        throw new WebBackupError(
          WEB_BACKUP_ERROR_CODES.EXPORT_UNAVAILABLE,
          'Web backup export is unavailable in this environment.',
        )
      }

      anchor.href = objectUrl
      anchor.download = filename
      documentLike.body?.appendChild?.(anchor)
      anchor.click()
      return { filename }
    } finally {
      anchor?.remove?.()
      urlApi.revokeObjectURL(objectUrl)
    }
  }

  async function importBackup(file) {
    if (typeof file?.text !== 'function') {
      throw new WebBackupError(
        WEB_BACKUP_ERROR_CODES.IMPORT_UNAVAILABLE,
        'The selected file cannot be read in this environment.',
      )
    }

    try {
      const data = JSON.parse(await file.text())
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new TypeError('Backup data must be a JSON object.')
      }
      return data
    } catch (cause) {
      if (cause instanceof WebBackupError) throw cause
      throw new WebBackupError(
        WEB_BACKUP_ERROR_CODES.INVALID_FILE,
        'The selected file is not a valid backup.',
        { cause },
      )
    }
  }

  return { exportBackup, importBackup }
}

export const webBackupAdapter = createWebBackupAdapter()
