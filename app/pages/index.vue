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
  <div class="min-h-screen flex flex-col">
    <header
      class="sticky top-0 z-40 w-full flex items-center px-4 sm:px-6"
      style="background-color: var(--bg-appbar); color: #fff; min-height: 56px; box-shadow: var(--shadow-4);"
    >
      <h1 class="mui-h6 flex-1" style="color: #fff;">Story Point Poker</h1>
    </header>

    <main class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="mui-paper w-full max-w-md" style="padding: 24px;">
        <h2 class="mui-h5 text-center">Create a planning poker room</h2>
        <p class="mui-caption text-center mt-2" style="color: var(--text-muted);">
          and start estimating with your team right away
        </p>
        <div class="flex flex-col gap-4 mt-6">
          <input
            v-model="name"
            type="text"
            placeholder="Please enter your name"
            class="mui-input"
            :class="{ 'is-error': hasError }"
            @keyup.enter="createRoom"
          />
          <div class="flex justify-center">
            <button class="mui-btn" @click="createRoom">Create Room</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
