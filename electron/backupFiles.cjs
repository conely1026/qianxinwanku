'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')
const {
  APP_STATE_MAX_BYTES,
  assertAppStatePayload,
} = require('./bridgeContract.cjs')

function createDesktopBackupFilename(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('A valid date is required')
  }
  return `千薪万苦-桌面备份-${date.toISOString().slice(0, 10)}.json`
}

async function writeDesktopBackup(filePath, value, fileSystem = fs) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    throw new TypeError('Backup path must be absolute')
  }
  assertAppStatePayload(value)
  const serialized = `${JSON.stringify(value, null, 2)}\n`
  await fileSystem.writeFile(filePath, serialized, { encoding: 'utf8', mode: 0o600 })
  return path.basename(filePath)
}

async function readDesktopBackup(filePath, fileSystem = fs) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    throw new TypeError('Backup path must be absolute')
  }
  const serialized = await fileSystem.readFile(filePath, 'utf8')
  if (Buffer.byteLength(serialized, 'utf8') > APP_STATE_MAX_BYTES) {
    throw new RangeError('Backup file is too large')
  }
  const value = JSON.parse(serialized)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Backup root must be an object')
  }
  return value
}

module.exports = {
  createDesktopBackupFilename,
  readDesktopBackup,
  writeDesktopBackup,
}
