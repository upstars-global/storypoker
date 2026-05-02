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
  <div class="mui-modal-overlay" @click.self="emit('close')">
    <div class="mui-modal-paper">
      <button
        class="mui-icon-btn absolute"
        style="top: 8px; right: 8px;"
        aria-label="Close"
        @click="emit('close')"
      >
        <IconClose style="font-size: 1.25rem;" />
      </button>
      <h2 class="mui-h5 text-center">
        {{ mode === 'signin' ? 'Sign In' : 'Sign Up' }}
      </h2>
      <p
        v-if="mode === 'signup'"
        class="mui-caption text-center mt-2"
        style="color: var(--text-muted);"
      >
        and gain moderator powers
      </p>
      <div class="flex flex-col gap-3 mt-6">
        <input
          v-model="email"
          type="email"
          placeholder="Please enter business email"
          class="mui-input"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Please enter password"
          class="mui-input"
        />
        <p v-if="error" class="text-sm" style="color: var(--danger);">{{ error }}</p>
        <div class="flex justify-center mt-2">
          <button class="mui-btn" :disabled="loading" @click="submit">
            {{ mode === 'signin' ? 'Sign In' : 'Sign Up' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
