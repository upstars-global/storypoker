<script setup lang="ts">
const name = ref('')
const hasError = ref(false)
const { $supabase } = useNuxtApp()
const router = useRouter()

async function createRoom() {
  if (!name.value.trim()) {
    hasError.value = true
    return
  }
  hasError.value = false
  const roomId = generateRoomId()
  const { error: roomErr } = await $supabase.from('rooms').insert({ id: roomId })
  if (roomErr) throw roomErr
  const { error: stateErr } = await $supabase.from('room_state').insert({ room_id: roomId })
  if (stateErr) throw stateErr
  const { data: player, error: playerErr } = await $supabase
    .from('players')
    .insert({ room_id: roomId, name: name.value.trim(), is_moderator: true })
    .select()
    .single()
  if (playerErr) throw playerErr
  localStorage.setItem(
    `storypoker_session_${roomId}`,
    JSON.stringify({ playerId: player.id, playerName: player.name })
  )
  router.push(`/room/${roomId}`)
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <h1 class="text-2xl font-semibold mb-2 text-center">Create a planning poker room</h1>
    <p class="text-gray-400 mb-8 text-center">and start estimating with your team right away</p>
    <div class="w-full max-w-sm flex flex-col gap-4">
      <input
        v-model="name"
        type="text"
        placeholder="Please enter your name"
        class="bg-transparent border rounded px-4 py-3 outline-none transition-colors"
        :class="hasError ? 'border-red-500' : 'border-gray-600 focus:border-gray-400'"
        @keyup.enter="createRoom"
      />
      <button
        class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 rounded-full uppercase tracking-widest transition-colors"
        @click="createRoom"
      >
        Create Room
      </button>
    </div>
  </div>
</template>
