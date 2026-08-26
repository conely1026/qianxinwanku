import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('compact skins consume only the shared model and injected actions', () => {
  const capsuleSource = readFileSync(new URL('./CapsuleCompactView.jsx', import.meta.url), 'utf8')
  const catSource = readFileSync(new URL('./OfficeCatCompactView.jsx', import.meta.url), 'utf8')

  for (const source of [capsuleSource, catSource]) {
    for (const forbidden of [
      'getWorkSnapshot',
      'reconcileLeaveSession',
      'localStorage',
      'desktopBridge',
      'globalThis.window',
      'document.',
      'status.includes',
    ]) {
      assert.equal(source.includes(forbidden), false, `skin must not contain ${forbidden}`)
    }
    assert.match(source, /model\.phase/)
    assert.match(source, /model\.timer/)
    assert.equal(source.includes('model.countdown.activeSeconds'), false)
    assert.match(source, /actions\.toggleExpanded/)
    assert.match(source, /actions\.toggleLeave/)
    assert.equal(
      [...source.matchAll(/onClick=\{actions\.toggleExpanded\}/gu)].length,
      1,
      'only the explicit expand button may expand the compact widget',
    )
    assert.equal(
      [...source.matchAll(/onClick=\{actions\.toggleLeave\}/gu)].length,
      1,
      'only the explicit leave button may toggle leave state',
    )
    assert.doesNotMatch(source, /className="(?:desktop-widget|office-cat)-main-action"[\s\S]{0,100}data-window-no-drag/)
  }
})

test('built-in skins share one compact window size', () => {
  const builtInSource = readFileSync(new URL('./builtInSkins.js', import.meta.url), 'utf8')
  const compactSizes = [...builtInSource.matchAll(/compactSize:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/gu)]
    .map((match) => ({ width: Number(match[1]), height: Number(match[2]) }))

  assert.deepEqual(compactSizes, [
    { width: 360, height: 76 },
    { width: 360, height: 76 },
  ])
})

test('office cat maps approved RGBA artwork without baking UI into the assets', () => {
  const catSource = readFileSync(new URL('./OfficeCatCompactView.jsx', import.meta.url), 'utf8')
  const approvedAssets = [
    'office-cat-working-p1-round-paws-v3-rgba.png',
    'office-cat-leave-skateboard-v5.png',
    'office-cat-lunch-keyboard-v5.png',
    'office-cat-after-work-car-v5.png',
    'office-cat-rest-day-gaming-v4.png',
  ]

  for (const assetName of approvedAssets) {
    assert.equal(catSource.includes(assetName), true, `${assetName} must be mapped by the cat skin`)
    const png = readFileSync(new URL(`./office-cat/assets/${assetName}`, import.meta.url))
    assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG')
    assert.equal(png.readUInt32BE(16), 512, `${assetName} width`)
    assert.equal(png.readUInt32BE(20), 512, `${assetName} height`)
    assert.equal(png[24], 8, `${assetName} bit depth`)
    assert.equal(png[25], 6, `${assetName} must use RGBA color type`)
  }

  assert.equal(catSource.includes('office-cat-paid-leave.png'), false)
})
