export const DESKTOP_BACKUP_ERROR_CODES = Object.freeze({
  BRIDGE_UNAVAILABLE: 'DESKTOP_BACKUP_BRIDGE_UNAVAILABLE',
  INVALID_RESULT: 'DESKTOP_BACKUP_INVALID_RESULT',
})

export class DesktopBackupError extends Error {
  constructor(code, message, options) {
    super(message, options)
    this.name = 'DesktopBackupError'
    this.code = code
  }
}

export function createDesktopBackupAdapter(bridge) {
  function requireMethod(method) {
    if (typeof bridge?.[method] !== 'function') {
      throw new DesktopBackupError(
        DESKTOP_BACKUP_ERROR_CODES.BRIDGE_UNAVAILABLE,
        `desktopBridge.${method} is unavailable`,
      )
    }
    return bridge[method].bind(bridge)
  }

  return Object.freeze({
    async exportBackup(data) {
      const result = await requireMethod('exportBackup')(data)
      if (!result || typeof result !== 'object' || typeof result.canceled !== 'boolean') {
        throw new DesktopBackupError(
          DESKTOP_BACKUP_ERROR_CODES.INVALID_RESULT,
          'Desktop backup export returned an invalid result',
        )
      }
      return result
    },
    async importBackup() {
      const result = await requireMethod('importBackup')()
      if (!result || typeof result !== 'object' || typeof result.canceled !== 'boolean') {
        throw new DesktopBackupError(
          DESKTOP_BACKUP_ERROR_CODES.INVALID_RESULT,
          'Desktop backup import returned an invalid result',
        )
      }
      if (result.canceled) return null
      if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
        throw new DesktopBackupError(
          DESKTOP_BACKUP_ERROR_CODES.INVALID_RESULT,
          'Desktop backup import did not return an object',
        )
      }
      return result.data
    },
  })
}
