interface StoredSession {
  playerId: string
  playerName: string
}

export function usePlayer(roomId: string) {
  const { $supabase } = useNuxtApp()

  function getStoredSession(): StoredSession | null {
    if (!import.meta.client) return null
    const raw = localStorage.getItem(`storypoker_session_${roomId}`)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  function saveSession(playerId: string, playerName: string) {
    localStorage.setItem(
      `storypoker_session_${roomId}`,
      JSON.stringify({ playerId, playerName })
    )
  }

  function clearSession() {
    localStorage.removeItem(`storypoker_session_${roomId}`)
  }

  async function joinRoom(name: string, userId?: string) {
    const { data, error } = await $supabase
      .from('players')
      .insert({ room_id: roomId, name, is_online: true, user_id: userId ?? null })
      .select()
      .single()
    if (error) throw error
    saveSession(data.id, data.name)
    return data
  }

  async function rejoinRoom(playerId: string) {
    const { data, error } = await $supabase
      .from('players')
      .update({ is_online: true })
      .eq('id', playerId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function setOffline(playerId: string) {
    await $supabase
      .from('players')
      .update({ is_online: false })
      .eq('id', playerId)
  }

  async function castVote(playerId: string, vote: string) {
    await $supabase.from('players').update({ vote }).eq('id', playerId)
  }

  async function rename(playerId: string, name: string) {
    await $supabase.from('players').update({ name }).eq('id', playerId)
  }

  async function toggleModerator(playerId: string, isModerator: boolean) {
    await $supabase.from('players').update({ is_moderator: isModerator }).eq('id', playerId)
  }

  async function kickPlayer(playerId: string) {
    await $supabase.from('players').delete().eq('id', playerId)
  }

  async function leaveRoom(playerId: string) {
    clearSession()
    await $supabase
      .from('players')
      .update({ left_at: new Date().toISOString(), is_online: false })
      .eq('id', playerId)
  }

  async function linkUser(playerId: string, userId: string) {
    await $supabase.from('players').update({ user_id: userId }).eq('id', playerId)
  }

  return {
    getStoredSession,
    saveSession,
    clearSession,
    joinRoom,
    rejoinRoom,
    setOffline,
    castVote,
    rename,
    toggleModerator,
    kickPlayer,
    leaveRoom,
    linkUser,
  }
}
