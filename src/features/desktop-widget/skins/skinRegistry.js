export const DEFAULT_DESKTOP_WIDGET_SKIN_ID = 'capsule'

const SKIN_ID_PATTERN = /^[a-z][a-z0-9-]*$/

export function defineDesktopWidgetSkin(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('desktop widget skin must be an object')
  }

  const { id, version, displayName, compactSize, CompactView } = definition
  if (!SKIN_ID_PATTERN.test(id)) throw new TypeError('desktop widget skin requires a stable id')
  if (!Number.isInteger(version) || version < 1) {
    throw new TypeError('desktop widget skin requires a positive integer version')
  }
  if (!String(displayName || '').trim()) {
    throw new TypeError('desktop widget skin requires a displayName')
  }
  if (
    !compactSize
    || !Number.isFinite(compactSize.width)
    || !Number.isFinite(compactSize.height)
    || compactSize.width <= 0
    || compactSize.height <= 0
  ) {
    throw new TypeError('desktop widget skin requires a positive compactSize')
  }
  if (typeof CompactView !== 'function') {
    throw new TypeError('desktop widget skin requires a CompactView component')
  }

  return Object.freeze({
    id,
    version,
    displayName: displayName.trim(),
    compactSize: Object.freeze({
      width: compactSize.width,
      height: compactSize.height,
    }),
    CompactView,
  })
}

export function createDesktopWidgetSkinRegistry(
  definitions,
  { fallbackId = DEFAULT_DESKTOP_WIDGET_SKIN_ID } = {},
) {
  const skins = new Map()
  for (const definition of definitions) {
    const skin = defineDesktopWidgetSkin(definition)
    if (skins.has(skin.id)) throw new TypeError(`duplicate desktop widget skin id: ${skin.id}`)
    skins.set(skin.id, skin)
  }

  const fallback = skins.get(fallbackId)
  if (!fallback) throw new TypeError(`missing fallback desktop widget skin: ${fallbackId}`)

  return Object.freeze({
    fallbackId,
    list() {
      return [...skins.values()]
    },
    has(id) {
      return skins.has(id)
    },
    resolve(id) {
      return skins.get(id) || fallback
    },
    resolveId(id) {
      return skins.has(id) ? id : fallbackId
    },
  })
}
