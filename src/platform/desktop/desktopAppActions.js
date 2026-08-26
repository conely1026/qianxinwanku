export const DESKTOP_STORAGE_DESCRIPTION = '工资、班次、换算和离席数据保存在此电脑的应用数据目录中。'
export const DESKTOP_RELEASE_STORAGE_NOTE = '更新阅读状态只保存在桌面版，不会清理工资或计时数据。'

export function confirmDesktopDataReset(confirmAction = globalThis.confirm) {
  return typeof confirmAction === 'function'
    ? confirmAction('确定清空桌面版的本机工资、班次和换算数据吗？此操作无法撤销。')
    : false
}

export function notifyDesktopActionError(
  error,
  alertAction = globalThis.alert,
) {
  if (typeof alertAction === 'function') {
    alertAction('操作没有完成，请检查文件后重试。')
  }
  return error
}
