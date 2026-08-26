import { WEB_BACKUP_ERROR_CODES, WebBackupError } from './webBackup.js'

export const RESET_CONFIRMATION = '确定清空这台设备上的全部参数和统计吗？此操作无法撤销。'
export const INVALID_BACKUP_ALERT = '这个文件不是有效的千薪万苦数据。'
export const WEB_STORAGE_DESCRIPTION = '参数、项目和统计使用 localStorage 保存；应用外壳会缓存以便再次打开或离线使用。'
export const WEB_RELEASE_STORAGE_NOTE = '本次更新不会清空当前浏览器里的本机数据。'

export function confirmWebDataReset(windowObject = globalThis.window) {
  return Boolean(windowObject?.confirm(RESET_CONFIRMATION))
}

export function alertInvalidWebBackup(windowObject = globalThis.window) {
  windowObject?.alert(INVALID_BACKUP_ALERT)
}

export async function importWebBackup(
  file,
  { backupAdapter, onImport, onInvalidFile },
) {
  if (!backupAdapter) throw new TypeError('importWebBackup requires backupAdapter')
  if (typeof onImport !== 'function') throw new TypeError('importWebBackup requires onImport')
  if (typeof onInvalidFile !== 'function') throw new TypeError('importWebBackup requires onInvalidFile')

  let data
  try {
    data = await backupAdapter.importBackup(file)
  } catch (error) {
    if (
      !(error instanceof WebBackupError)
      || error.code !== WEB_BACKUP_ERROR_CODES.INVALID_FILE
    ) {
      throw error
    }
    onInvalidFile()
    return false
  }

  const imported = await onImport(data)
  if (imported === false) {
    onInvalidFile()
    return false
  }
  return true
}

export function scrollWebToTop(windowObject = globalThis.window) {
  windowObject?.scrollTo({ top: 0, behavior: 'smooth' })
}
