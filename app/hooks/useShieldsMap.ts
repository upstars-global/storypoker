import { useMemo } from 'react'
import { usePlayersStore } from '~/stores/players'

export function useShieldsMap(): Map<string, string[]> {
  const visiblePlayers = usePlayersStore(state => state.visiblePlayers)
  return useMemo(() => {
    const m = new Map<string, string[]>()
    for (const p of visiblePlayers) m.set(p.id, p.shields ?? [])
    return m
  }, [visiblePlayers])
}
