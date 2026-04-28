<script setup lang="ts">
const props = defineProps<{
  mode: 'signin' | 'signup'
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { signIn, signUp } = useAuth()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (props.mode === 'signin') {
      await signIn(email.value, password.value)
    } else {
      await signUp(email.value, password.value)
    }
    emit('success')
    emit('close')
  } catch (e: any) {
    error.value = e.message ?? 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-sm relative">
      <button class="absolute top-4 right-4 text-gray-400 hover:text-white" @click="emit('close')">
        <Icon name="mdi:close" class="w-5 h-5" />
      </button>
      <h2 class="text-xl font-semibold mb-1 text-center">
        {{ mode === 'signin' ? 'Sign In' : 'Sign Up' }}
      </h2>
      <p v-if="mode === 'signup'" class="text-gray-400 text-sm text-center mb-4">and gain moderator powers</p>
      <div class="flex flex-col gap-3 mt-4">
        <input
          v-model="email"
          type="email"
          placeholder="Please enter business email"
          class="bg-transparent border border-gray-600 rounded px-4 py-3 text-sm outline-none focus:border-gray-400 text-white"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Please enter password"
          class="bg-transparent border border-gray-600 rounded px-4 py-3 text-sm outline-none focus:border-gray-400 text-white"
        />
        <p v-if="error" class="text-red-400 text-xs">{{ error }}</p>
        <button
          class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 rounded-full uppercase tracking-widest transition-colors disabled:opacity-50"
          :disabled="loading"
          @click="submit"
        >
          {{ mode === 'signin' ? 'Sign In' : 'Sign Up' }}
        </button>
      </div>
    </div>
  </div>
</template>
