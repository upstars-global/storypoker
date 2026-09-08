import { getIconData } from '@iconify/utils'
import type { IconifyIcon, IconifyJSON } from '@iconify/types'

function sortRecord(icon: IconifyIcon): IconifyIcon {
  const sorted = { body: icon.body }
  for (const key of Object.keys(icon).sort()) {
    Object.assign(sorted, { [key]: icon[key as keyof IconifyIcon] })
  }
  return sorted
}

export function buildCollections(
  sets: Record<string, IconifyJSON>,
  names: readonly string[],
): IconifyJSON[] {
  const result: Record<string, IconifyJSON> = {}
  for (const fullName of [...new Set(names)].sort()) {
    const [prefix, name] = fullName.split(':')
    if (!prefix || !name || !sets[prefix]) throw new Error(fullName)
    const data = getIconData(sets[prefix], name)
    if (!data) throw new Error(fullName)
    const collection = result[prefix] ??= { prefix, icons: {} }
    collection.icons[name] = sortRecord(data)
  }
  return Object.keys(result).sort().map(prefix => result[prefix]!)
}

export function serializeCollections(sets: IconifyJSON[]): string {
  const ordered = [...sets]
    .sort((a, b) => a.prefix.localeCompare(b.prefix))
    .map(set => ({
      prefix: set.prefix,
      icons: Object.fromEntries(Object.keys(set.icons).sort().map(name => [name, set.icons[name]!])),
    }))
  return JSON.stringify(ordered, null, 2) + '\n'
}
