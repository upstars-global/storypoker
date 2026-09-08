import { addCollection } from '@iconify/vue'
import type { IconifyJSON } from '@iconify/types'
import collections from '~/generated/iconCollections.json'
import { registerAppIcons } from '~/lib/registerAppIcons'

export function registerLocalIcons(): void {
  for (const collection of collections as unknown as IconifyJSON[]) {
    addCollection(collection)
  }
  registerAppIcons()
}
