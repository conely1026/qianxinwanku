import { CapsuleCompactView } from './CapsuleCompactView.jsx'
import { OfficeCatCompactView } from './OfficeCatCompactView.jsx'
import {
  createDesktopWidgetSkinRegistry,
  defineDesktopWidgetSkin,
} from './skinRegistry.js'

export const capsuleDesktopWidgetSkin = defineDesktopWidgetSkin({
  id: 'capsule',
  version: 1,
  displayName: '极简胶囊',
  compactSize: { width: 360, height: 76 },
  CompactView: CapsuleCompactView,
})

export const officeCatDesktopWidgetSkin = defineDesktopWidgetSkin({
  id: 'office-cat',
  version: 1,
  displayName: '小猫上班',
  compactSize: { width: 360, height: 76 },
  CompactView: OfficeCatCompactView,
})

export const desktopWidgetSkinRegistry = createDesktopWidgetSkinRegistry([
  capsuleDesktopWidgetSkin,
  officeCatDesktopWidgetSkin,
])
