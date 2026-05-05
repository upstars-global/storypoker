<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { validateEmail } from '~/utils/authValidation'

useHead({ title: 'Reset Password' })

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const router = useRouter()

const form = reactive({ email: '' })
const errors = reactive<{ email?: string; server?: string }>({})
const loading = shallowRef(false)
const success = shallowRef(false)

onMounted(async () => {
  await authStore.init()
  if (user.value) router.push('/')
})

watch(user, (next) => {
  if (next) router.push('/')
})

function validate() {
  errors.email = validateEmail(form.email)
  return !errors.email
}

async function onSubmit() {
  errors.server = undefined
  if (!validate()) return

  loading.value = true
  try {
    await authStore.requestPasswordReset(form.email, `${window.location.origin}/reset-password`)
    success.value = true
  } catch (e: any) {
    errors.server = e.message ?? 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-body)]">
    <AppHeader
      :online-count="0"
      :is-moderator="false"
      player-name=""
      @open-sign-in="router.push('/login')"
      @open-sign-up="router.push('/signup')"
      @sign-out="authStore.signOut()"
    />

    <main class="flex flex-1 items-center justify-center px-4 py-10">
      <section class="mui-modal-paper max-w-md">
        <h1 class="mui-h5 text-center">Reset Password</h1>
        <p class="mui-caption text-center mt-2">Enter your email and we will send password reset instructions.</p>

        <div v-if="success" class="text-center mt-6">
          <p class="mui-body">Check your email for a password reset link.</p>
          <NuxtLink to="/login" class="mui-caption underline hover:no-underline" style="color: var(--primary);">Back to Sign In</NuxtLink>
        </div>

        <form v-else class="flex flex-col gap-3 mt-6" @submit.prevent="onSubmit">
          <div>
            <input v-model.trim="form.email" type="email" autocomplete="email" placeholder="Please enter business email" class="mui-input" :class="{ 'is-error': errors.email }" />
            <p v-if="errors.email" class="text-sm mt-1" style="color: var(--danger);">{{ errors.email }}</p>
          </div>

          <p v-if="errors.server" class="text-sm" style="color: var(--danger);">{{ errors.server }}</p>

          <div class="flex justify-center mt-2">
            <button v-wave class="mui-btn" type="submit" :disabled="loading">
              {{ loading ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </div>

          <p class="mui-caption text-center mt-2">
            Remembered your password?
            <NuxtLink to="/login" class="underline hover:no-underline" style="color: var(--primary);">Sign In</NuxtLink>
          </p>
        </form>
      </section>
    </main>
  </div>
</template>
