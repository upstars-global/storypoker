export function relativeTime(date: string | Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'a few seconds ago'
  if (diff < 3600) {
    const m = Math.floor(diff / 60)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  const h = Math.floor(diff / 3600)
  return `${h} hour${h === 1 ? '' : 's'} ago`
}
