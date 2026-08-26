import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyLocalPersistentUpdate,
  applySubscribedPersistentData,
  createPersistentSnapshot,
  reportPersistentWriteError,
  resolveInitialPersistentData,
} from './persistentStateCore.js'
import { createSerialWriteQueue } from './serialWriteQueue.js'

export function usePersistentState(storage, options) {
  if (!storage) throw new TypeError('usePersistentState requires a storage adapter')
  const [snapshot, setSnapshot] = useState(() => createPersistentSnapshot(
    resolveInitialPersistentData(storage, options),
  ))
  const writeQueue = useMemo(
    () => createSerialWriteQueue((data) => storage.write(data)),
    [storage],
  )
  const lastEnqueuedWrite = useRef(null)
  const pendingWrite = snapshot.pendingWrite

  useEffect(() => {
    if (!pendingWrite || lastEnqueuedWrite.current === pendingWrite) return
    lastEnqueuedWrite.current = pendingWrite
    void writeQueue.enqueue(pendingWrite.data).catch((error) => {
      reportPersistentWriteError(storage, error)
    })
  }, [pendingWrite, storage, writeQueue])

  useEffect(() => {
    return storage.subscribe((nextData) => {
      setSnapshot((current) => applySubscribedPersistentData(current, nextData))
    })
  }, [storage])

  const setData = useCallback((update) => {
    setSnapshot((current) => applyLocalPersistentUpdate(current, update))
  }, [])

  const replaceData = useCallback((nextData) => {
    setData(storage.normalize(nextData))
  }, [setData, storage])

  return [snapshot.data, setData, replaceData]
}
