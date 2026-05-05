<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { validateEmail, validateRequiredPassword } from '~/utils/authValidation'

useHead({ title: 'Sign In' })

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const router = useRouter()

const form = reactive({ email: '', password: '' })
const errors = reactive<{ email?: string; password?: string; server?: string }>({})
const loading = shallowRef(false)

onMounted(async () => {
  await authStore.init()
  if (user.value) router.push('/')
})

watch(user, (next) => {
  if (next) router.push('/')
})

function validate() {
  errors.email = validateEmail(form.email)
  errors.password = validateRequiredPassword(form.password)
  return !errors.email && !errors.password
}

async function onSubmit() {
  errors.server = undefined
  if (!validate()) return

  loading.value = true
  try {
    await authStore.signIn(form.email, form.password)
    router.push('/')
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
        <h1 class="mui-h5 text-center">Sign In</h1>
        <p class="mui-caption text-center mt-2">Welcome back to Story Poker.</p>

        <form class="flex flex-col gap-3 mt-6" @submit.prevent="onSubmit">
          <div>
            <input v-model.trim="form.email" type="email" autocomplete="email" placeholder="Please enter business email" class="mui-input" :class="{ 'is-error': errors.email }" />
            <p v-if="errors.email" class="text-sm mt-1" style="color: var(--danger);">{{ errors.email }}</p>
          </div>

          <div>
            <div class="flex items-center justify-between gap-3 mb-1">
              <span class="mui-caption">Password</span>
              <NuxtLink to="/forgot-password" class="mui-caption underline hover:no-underline" style="color: var(--primary);">Forgot password?</NuxtLink>
            </div>
            <input v-model="form.password" type="password" autocomplete="current-password" placeholder="Please enter password" class="mui-input" :class="{ 'is-error': errors.password }" />
            <p v-if="errors.password" class="text-sm mt-1" style="color: var(--danger);">{{ errors.password }}</p>
          </div>

          <p v-if="errors.server" class="text-sm" style="color: var(--danger);">{{ errors.server }}</p>

          <div class="flex justify-center mt-2">
            <button v-wave class="mui-btn" type="submit" :disabled="loading">
              {{ loading ? 'Signing In...' : 'Sign In' }}
            </button>
          </div>

          <p class="mui-caption text-center mt-2">
            Don't have an account?
            <NuxtLink to="/signup" class="underline hover:no-underline" style="color: var(--primary);">Sign Up</NuxtLink>
          </p>
        </form>
      </section>
    </main>
  </div>
</template>
