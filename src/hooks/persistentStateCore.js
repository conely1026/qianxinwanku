const hasOwn = Object.prototype.hasOwnProperty

export function resolveInitialPersistentData(storage, options) {
  const hasInitialState = options != null && hasOwn.call(options, 'initialState')
  return hasInitialState
    ? storage.normalize(options.initialState)
    : storage.read()
}

export function createPersistentSnapshot(data) {
  return {
    data,
    pendingWrite: null,
  }
}

export function applyLocalPersistentUpdate(snapshot, update) {
  const nextData = typeof update === 'function'
    ? update(snapshot.data)
    : update

  if (Object.is(nextData, snapshot.data)) return snapshot

  return {
    data: nextData,
    pendingWrite: { data: nextData },
  }
}

export function applySubscribedPersistentData(snapshot, nextData) {
  if (Object.is(nextData, snapshot.data)) return snapshot
  return {
    ...snapshot,
    data: nextData,
  }
}

export function reportPersistentWriteError(storage, error) {
  if (typeof storage.onWriteError !== 'function') return
  try {
    storage.onWriteError(error)
  } catch {
    // Error reporting must not create another unhandled rejection.
  }
}
