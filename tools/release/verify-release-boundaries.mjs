import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const requestedModes = new Set(process.argv.slice(2))
const verifyWeb = requestedModes.size === 0 || requestedModes.has('--web')
const verifyDesktop = requestedModes.size === 0 || requestedModes.has('--desktop')

if (verifyWeb) verifyWebBundle(resolve('dist'))
if (verifyDesktop) verifyDesktopBundle(resolve('dist-desktop'))

console.log(`Release boundaries verified: ${[
  verifyWeb && 'Web',
  verifyDesktop && 'Desktop',
].filter(Boolean).join(' + ')}`)

function verifyWebBundle(root) {
  const files = listFiles(root)
  rejectMatching(files, /office-cat|electron|desktopBridge/iu, 'Web output contains Desktop-only files')
  rejectText(files, /desktopBridge|qianxinwanku\.desktop-harness/u, 'Web output contains Desktop-only runtime code')
}

function verifyDesktopBundle(root) {
  const files = listFiles(root)
  const requiredAssets = [
    'office-cat-working-p1-round-paws-v3-rgba-',
    'office-cat-leave-skateboard-v5-',
    'office-cat-lunch-keyboard-v5-',
    'office-cat-after-work-car-v5-',
    'office-cat-rest-day-gaming-v4-',
  ]
  for (const asset of requiredAssets) {
    if (!files.some((file) => file.includes(asset))) {
      throw new Error(`Desktop output is missing approved skin asset: ${asset}`)
    }
  }
  rejectMatching(files, /manifest\.webmanifest|sw\.js/iu, 'Desktop output contains Web PWA files')
  rejectText(
    files,
    /qianxinwanku\.desktop-harness|Desktop browser harness requires/u,
    'Desktop production output contains the development browser harness',
  )
}

function listFiles(root) {
  if (!existsSync(root)) throw new Error(`Build output does not exist: ${root}`)
  const files = []
  const pending = [root]
  while (pending.length > 0) {
    const current = pending.pop()
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) pending.push(path)
      else if (entry.isFile()) files.push(path)
    }
  }
  return files
}

function rejectMatching(files, pattern, message) {
  const match = files.find((file) => pattern.test(file))
  if (match) throw new Error(`${message}: ${match}`)
}

function rejectText(files, pattern, message) {
  const textFiles = files.filter((file) => /\.(?:css|html|js|json|txt)$/iu.test(file))
  for (const file of textFiles) {
    if (statSync(file).size > 5 * 1024 * 1024) continue
    if (pattern.test(readFileSync(file, 'utf8'))) throw new Error(`${message}: ${file}`)
  }
}
