'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const {
  APP_STATE_MAX_BYTES,
  PREFERENCES_MAX_BYTES,
  assertAppStatePayload,
  assertPreferencesPayload,
} = require('./bridgeContract.cjs')

function getDesktopDataPaths(userDataPath) {
  if (typeof userDataPath !== 'string' || !path.isAbsolute(userDataPath)) {
    throw new TypeError('userDataPath must be an absolute path')
  }
  return {
    appStatePath: path.join(userDataPath, 'app-state.json'),
    preferencesPath: path.join(userDataPath, 'desktop-preferences.json'),
  }
}

function createSerializedAtomicJsonFile(filePath, maximumBytes) {
  let writeQueue = Promise.resolve()

  async function read() {
    const content = await fs.readFile(filePath, 'utf8')
    if (Buffer.byteLength(content, 'utf8') > maximumBytes) {
      throw new RangeError(`${path.basename(filePath)} is too large`)
    }
    return JSON.parse(content)
  }

  function write(value) {
    const serialized = `${JSON.stringify(value)}\n`
    if (Buffer.byteLength(serialized, 'utf8') > maximumBytes) {
      return Promise.reject(new RangeError(`${path.basename(filePath)} is too large`))
    }

    const operation = writeQueue.catch(() => undefined).then(async () => {
      const directory = path.dirname(filePath)
      await fs.mkdir(directory, { recursive: true })
      const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`)
      let handle
      try {
        handle = await fs.open(temporaryPath, 'wx', 0o600)
        await handle.writeFile(serialized, 'utf8')
        await handle.sync()
        await handle.close()
        handle = undefined
        await fs.rename(temporaryPath, filePath)
      } finally {
        if (handle) await handle.close().catch(() => undefined)
        await fs.unlink(temporaryPath).catch((error) => {
          if (error.code !== 'ENOENT') throw error
        })
      }
    })
    writeQueue = operation
    return operation
  }

  return { read, write }
}

function createDesktopDataStore(userDataPath) {
  const paths = getDesktopDataPaths(userDataPath)
  const appStateFile = createSerializedAtomicJsonFile(paths.appStatePath, APP_STATE_MAX_BYTES)
  const preferencesFile = createSerializedAtomicJsonFile(paths.preferencesPath, PREFERENCES_MAX_BYTES)

  async function readPlainObject(file) {
    try {
      const value = await file.read()
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('stored JSON root must be a plain object')
      }
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError('stored JSON root must be a plain object')
      }
      return value
    } catch (error) {
      if (error.code === 'ENOENT' || error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) {
        return null
      }
      throw error
    }
  }

  return Object.freeze({
    async loadBootstrap() {
      const [appState, preferences] = await Promise.all([
        readPlainObject(appStateFile),
        readPlainObject(preferencesFile),
      ])
      return { appState, preferences }
    },
    async saveAppState(value) {
      assertAppStatePayload(value)
      await appStateFile.write(value)
      return true
    },
    async savePreferences(value) {
      assertPreferencesPayload(value)
      await preferencesFile.write(value)
      return true
    },
  })
}

module.exports = { createDesktopDataStore, getDesktopDataPaths }
