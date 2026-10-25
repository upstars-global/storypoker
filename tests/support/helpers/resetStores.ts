import { useAuthStore } from '~/stores/auth'
import { usePlayersStore } from '~/stores/players'
import { usePresenceStore } from '~/stores/presence'
import { useProfilesStore } from '~/stores/profiles'
import { useRoomStore } from '~/stores/room'

export async function resetStores(): Promise<void> {
  await usePresenceStore.getState().stop()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  usePlayersStore.setState(usePlayersStore.getInitialState(), true)
  usePresenceStore.setState(usePresenceStore.getInitialState(), true)
  useProfilesStore.setState(useProfilesStore.getInitialState(), true)
  useRoomStore.setState(useRoomStore.getInitialState(), true)
}
