<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { validateEmail, validatePasswordConfirmation, validateRequiredPassword } from '~/utils/authValidation'

useHead({ title: 'Sign Up' })

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const router = useRouter()

const form = reactive({ email: '', password: '', confirm: '' })
const errors = reactive<{ email?: string; password?: string; confirm?: string; server?: string }>({})
const loading = shallowRef(false)
const success = shallowRef(false)

onMounted(async () => {
  await authStore.init()
  if (user.value) router.push('/')
})

watch(user, (next) => {
  if (next && !success.value) router.push('/')
})

function validate() {
  errors.email = validateEmail(form.email)
  errors.password = validateRequiredPassword(form.password)
  errors.confirm = validatePasswordConfirmation(form.password, form.confirm)
  return !errors.email && !errors.password && !errors.confirm
}

async function onSubmit() {
  errors.server = undefined
  if (!validate()) return

  loading.value = true
  try {
    await authStore.signUp(form.email, form.password)
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
        <h1 class="mui-h5 text-center">Sign Up</h1>
        <p class="mui-caption text-center mt-2">Create an account and gain moderator powers.</p>

        <div v-if="success" class="text-center mt-6">
          <p class="mui-body">Check your email to confirm your account.</p>
          <NuxtLink to="/login" class="mui-caption underline hover:no-underline" style="color: var(--primary);">Back to Sign In</NuxtLink>
        </div>

        <form v-else class="flex flex-col gap-3 mt-6" @submit.prevent="onSubmit">
          <div>
            <input v-model.trim="form.email" type="email" autocomplete="email" placeholder="Please enter business email" class="mui-input" :class="{ 'is-error': errors.email }" />
            <p v-if="errors.email" class="text-sm mt-1" style="color: var(--danger);">{{ errors.email }}</p>
          </div>

          <div>
            <input v-model="form.password" type="password" autocomplete="new-password" placeholder="Please enter password" class="mui-input" :class="{ 'is-error': errors.password }" />
            <p v-if="errors.password" class="text-sm mt-1" style="color: var(--danger);">{{ errors.password }}</p>
          </div>

          <div>
            <input v-model="form.confirm" type="password" autocomplete="new-password" placeholder="Confirm password" class="mui-input" :class="{ 'is-error': errors.confirm }" />
            <p v-if="errors.confirm" class="text-sm mt-1" style="color: var(--danger);">{{ errors.confirm }}</p>
          </div>

          <p v-if="errors.server" class="text-sm" style="color: var(--danger);">{{ errors.server }}</p>

          <div class="flex justify-center mt-2">
            <button v-wave class="mui-btn" type="submit" :disabled="loading">
              {{ loading ? 'Signing Up...' : 'Sign Up' }}
            </button>
          </div>

          <p class="mui-caption text-center mt-2">
            Already have an account?
            <NuxtLink to="/login" class="underline hover:no-underline" style="color: var(--primary);">Sign In</NuxtLink>
          </p>
        </form>
      </section>
    </main>
  </div>
</template>
