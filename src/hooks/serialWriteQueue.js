export function createSerialWriteQueue(write) {
  if (typeof write !== 'function') {
    throw new TypeError('createSerialWriteQueue requires a write function')
  }

  let tail = Promise.resolve()

  function enqueue(value) {
    const operation = tail.then(() => write(value))
    tail = operation.then(
      () => undefined,
      () => undefined,
    )
    return operation
  }

  function whenIdle() {
    return tail
  }

  return { enqueue, whenIdle }
}
