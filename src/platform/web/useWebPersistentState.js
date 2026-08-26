import {
  DEFAULT_CONVERSION_ITEMS,
  DEFAULT_STATE,
} from '../../core/state/appState.js'
import { usePersistentState } from '../../hooks/usePersistentState.js'
import { STORAGE_KEY, webStateStorage } from './webStateStorage.js'

export { DEFAULT_CONVERSION_ITEMS, DEFAULT_STATE, STORAGE_KEY }

export function normalizeState(value) {
  return webStateStorage.normalize(value)
}

export function useWebPersistentState() {
  return usePersistentState(webStateStorage)
}
