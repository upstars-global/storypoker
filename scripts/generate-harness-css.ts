import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { IconifyJSON } from '@iconify/types'
import { parseSvg } from './icons/parseSvg.ts'
import { generateIconCss } from '../tests/icon-rendering/generate-css.ts'
import { appIconNames } from '../app/utils/iconManifest.ts'

const root = resolve(import.meta.dirname, '..')
const harnessDir = join(root, 'tests/icon-rendering')

const subset = JSON.parse(readFileSync(join(root, 'app/generated/iconCollections.json'), 'utf8')) as IconifyJSON[]

const appIcons: IconifyJSON['icons'] = {}
for (const fullName of appIconNames) {
  const name = fullName.slice('app:'.length)
  appIcons[name] = parseSvg(readFileSync(join(root, `app/assets/icons/${name}.svg`), 'utf8'))
}

const { css, classes } = generateIconCss([...subset, { prefix: 'app', icons: appIcons }])
writeFileSync(join(harnessDir, 'icons.css'), css)
writeFileSync(join(harnessDir, 'iconClasses.json'), JSON.stringify(classes, null, 2) + '\n')
console.log(`wrote icons.css (${css.length} B) and ${Object.keys(classes).length} classes`)
