import { inputNames } from '~/utils/iconManifest'
import { mapIconName } from '~/utils/iconMap'
import classes from './iconClasses.json'
import './icons.css'

export function registerLocalIcons(): void {
  const missing = inputNames.filter(name => !(classes as Record<string, string>)[mapIconName(name)])
  if (missing.length) throw new Error(`Missing mask classes: ${missing.join(', ')}`)
}
