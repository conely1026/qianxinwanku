import { useState } from 'react'
import { Icon } from '../../components/Icons.jsx'

export function DesktopBackupImportAction({ backupAdapter, onImport, onError }) {
  const [busy, setBusy] = useState(false)

  async function importBackup() {
    if (busy) return
    setBusy(true)
    try {
      const data = await backupAdapter.importBackup()
      if (data && onImport(data) === false) {
        throw new TypeError('备份结构不受支持')
      }
    } catch (error) {
      onError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className="secondary-button" type="button" disabled={busy} onClick={importBackup}>
      <Icon name="upload" size={18} />
      {busy ? '正在导入' : '导入备份'}
    </button>
  )
}
