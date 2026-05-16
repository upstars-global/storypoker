<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { validateEmail, validateRequiredPassword } from '~/utils/authValidation'

const { t } = useI18n()
useHead({ title: t('login.pageTitle') })

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
  <div class="min-h-screen flex flex-col bg-app text-body">
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
        <h1 class="mui-h5 text-center">{{ $t('common.signIn') }}</h1>
        <p class="mui-caption text-center mt-2">{{ $t('login.welcome') }}</p>

        <form class="flex flex-col gap-3 mt-6" @submit.prevent="onSubmit">
          <div>
            <input v-model.trim="form.email" type="email" autocomplete="email" :placeholder="$t('common.emailPlaceholder')" class="mui-input" :class="{ 'is-error': errors.email }" data-testid="login-email" />
            <p v-if="errors.email" class="text-sm mt-1 text-danger">{{ errors.email }}</p>
          </div>

          <div>
            <div class="flex items-center justify-between gap-3 mb-1">
              <span class="mui-caption">{{ $t('common.password') }}</span>
              <NuxtLink to="/forgot-password" class="mui-caption underline hover:no-underline text-primary">{{ $t('auth.forgotPassword') }}</NuxtLink>
            </div>
            <input v-model="form.password" type="password" autocomplete="current-password" :placeholder="$t('common.passwordPlaceholder')" class="mui-input" :class="{ 'is-error': errors.password }" data-testid="login-password" />
            <p v-if="errors.password" class="text-sm mt-1 text-danger">{{ errors.password }}</p>
          </div>

          <p v-if="errors.server" class="text-sm text-danger">{{ errors.server }}</p>

          <div class="flex justify-center mt-2">
            <button v-wave class="mui-btn" type="submit" :disabled="loading" data-testid="login-submit">
              {{ loading ? $t('auth.signingIn') : $t('common.signIn') }}
            </button>
          </div>

          <p class="mui-caption text-center mt-2">
            {{ $t('login.noAccount') }}
            <NuxtLink to="/signup" class="underline hover:no-underline text-primary">{{ $t('common.signUp') }}</NuxtLink>
          </p>
        </form>
      </section>
    </main>
  </div>
</template>
