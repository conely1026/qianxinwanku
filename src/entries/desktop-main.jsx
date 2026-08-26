import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { desktopWidgetSkinRegistry } from '../features/desktop-widget/skins/builtInSkins.js'
import '../features/desktop-widget/skins/desktopWidgetSkins.css'
import {
  createDesktopBrowserHarnessBridge,
  isDesktopBrowserHarnessLocation,
} from '../platform/desktop/desktopBrowserHarnessBridge.js'
import { loadDesktopBootstrap } from '../platform/desktop/desktopBootstrap.js'
import { createDesktopPreferencesStorage } from '../platform/desktop/desktopPreferencesStorage.js'
import { createDesktopStateStorage } from '../platform/desktop/desktopStateStorage.js'
import { DesktopWidgetRoot } from '../platform/desktop/DesktopWidgetRoot.jsx'
import '../styles.css'
import '../platform/desktop/desktopRenderer.css'

const rootElement = document.getElementById('root')

function reportDesktopRendererError(error) {
  globalThis.console?.error?.('Desktop renderer error', error)
}

async function startDesktopRenderer() {
  const bridge = resolveDesktopRendererBridge()

  try {
    const bootstrap = await loadDesktopBootstrap(bridge, {
      resolveSkinId: (skinId) => desktopWidgetSkinRegistry.resolveId(skinId),
    })
    const adapterOptions = {
      bridge,
      onWriteError: reportDesktopRendererError,
    }
    const appStateStorage = createDesktopStateStorage({
      ...adapterOptions,
      initialState: bootstrap.appState,
    })
    const preferencesStorage = createDesktopPreferencesStorage({
      ...adapterOptions,
      initialState: bootstrap.preferences,
      resolveSkinId: (skinId) => desktopWidgetSkinRegistry.resolveId(skinId),
    })

    createRoot(rootElement).render(
      <StrictMode>
        <DesktopWidgetRoot
          bridge={bridge}
          bootstrap={bootstrap}
          appStateStorage={appStateStorage}
          preferencesStorage={preferencesStorage}
          onBridgeError={reportDesktopRendererError}
        />
      </StrictMode>,
    )
  } catch (error) {
    renderDesktopProtectionPage(error)
  }
}

function resolveDesktopRendererBridge() {
  const nativeBridge = globalThis.window?.desktopBridge
  if (nativeBridge) return nativeBridge
  if (import.meta.env.DEV && isDesktopBrowserHarnessLocation(globalThis.location)) {
    return createDesktopBrowserHarnessBridge({
      storage: globalThis.localStorage,
      location: globalThis.location,
    })
  }
  return undefined
}

function renderDesktopProtectionPage(error) {
  reportDesktopRendererError(error)
  createRoot(rootElement).render(
    <main className="desktop-protection-page" role="alert">
      <span>LOCAL DATA PROTECTED</span>
      <h1>本机数据暂时无法读取</h1>
      <p>桌面挂件没有载入，也没有写入任何默认值。请重新启动应用后再试。</p>
      <button type="button" onClick={() => globalThis.location?.reload()}>重新加载</button>
    </main>,
  )
}

void startDesktopRenderer()
