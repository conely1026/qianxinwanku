export function createWebClock({
  now = () => new Date(),
  setIntervalFn = globalThis.setInterval,
  clearIntervalFn = globalThis.clearInterval,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
} = {}) {
  return {
    now,
    setInterval(callback, delay) {
      const timer = setIntervalFn(callback, delay)
      return () => clearIntervalFn(timer)
    },
    setTimeout(callback, delay) {
      const timer = setTimeoutFn(callback, delay)
      return () => clearTimeoutFn(timer)
    },
  }
}

export const webClock = createWebClock()
