import { Icon } from '../../components/Icons.jsx'

export const WINDOWS_RELEASE_LATEST_URL = 'https://github.com/conely1026/qianxinwanku/releases/latest'

export function WebDesktopDownloadAction() {
  return (
    <a
      className="primary-button desktop-download-button"
      href={WINDOWS_RELEASE_LATEST_URL}
      target="_blank"
      rel="noreferrer"
    >
      <Icon name="download" size={18} />
      下载 Windows 桌面版
    </a>
  )
}
