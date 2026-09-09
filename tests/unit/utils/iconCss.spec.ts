import { expect, it } from 'vitest'
import type { IconifyJSON } from '@iconify/types'
import generated from '~/generated/iconCollections.json'
import { generateIconCss, iconClassName } from '../../icon-rendering/generate-css'
import { appIconNames, flagCases, inputNames } from '~/utils/iconManifest'
import { resolveIconName } from '~/utils/iconResolver'

const collections = generated as unknown as IconifyJSON[]

it('emits exactly one class per icon with no duplicates', () => {
  const { css, classes } = generateIconCss(collections)
  const names = collections.flatMap(set => Object.keys(set.icons).map(name => `${set.prefix}:${name}`))
  expect(Object.keys(classes).sort()).toEqual([...names].sort())
  for (const name of names) {
    expect(css.split(`.${iconClassName(name)} {`)).toHaveLength(2)
  }
})

it('carries dimensions for every icon and shares the common rules once', () => {
  const { css } = generateIconCss(collections)
  expect(css).toContain('.sp-icon')
  expect(css.split('.sp-icon {')).toHaveLength(2)
  expect(css).toMatch(/width:\s*1em/)
  expect(css).toMatch(/height:\s*1em/)
})

it('produces no rules for an empty collection and rejects unknown names', () => {
  const { css, classes } = generateIconCss([{ prefix: 'empty', icons: {} }])
  expect(css).toBe('')
  expect(classes).toEqual({})
  expect(iconClassName('ic:round-close')).toBe('sp-icon-ic-round-close')
})

it('covers every manifest icon in every flag combination', () => {
  const { classes } = generateIconCss([
    ...collections,
    { prefix: 'app', icons: Object.fromEntries(appIconNames.map(n => [n.slice(4), { body: '<path/>' }])) },
  ])
  const missing: string[] = []
  for (const name of inputNames) {
    for (const flags of flagCases) {
      const resolved = resolveIconName(name, flags)
      if (!classes[resolved]) missing.push(resolved)
    }
  }
  expect(missing).toEqual([])
})
