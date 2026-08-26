import { useRef } from 'react'
import { Icon } from '../../components/Icons'

export function WebBackupImportAction({ onImportFile }) {
  const fileInput = useRef(null)

  async function importFile(event) {
    const input = event.currentTarget
    const [file] = input.files || []
    if (!file) return
    try {
      await onImportFile(file)
    } finally {
      input.value = ''
    }
  }

  return (
    <>
      <button className="secondary-button" type="button" onClick={() => fileInput.current?.click()}>
        <Icon name="upload" size={18} />导入备份
      </button>
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept="application/json"
        onChange={importFile}
      />
    </>
  )
}
