<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { validateEmail } from '~/utils/authValidation'

const { t } = useI18n()
useHead({ title: t('forgotPassword.pageTitle') })

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
        <h1 class="mui-h5 text-center">{{ $t('forgotPassword.title') }}</h1>
        <p class="mui-caption text-center mt-2">{{ $t('forgotPassword.description') }}</p>

        <div v-if="success" class="text-center mt-6">
          <p class="mui-body">{{ $t('forgotPassword.checkEmail') }}</p>
          <NuxtLink to="/login" class="mui-caption underline hover:no-underline text-primary">{{ $t('forgotPassword.backToSignIn') }}</NuxtLink>
        </div>

        <form v-else class="flex flex-col gap-3 mt-6" @submit.prevent="onSubmit">
          <div>
            <input v-model.trim="form.email" type="email" autocomplete="email" :placeholder="$t('common.emailPlaceholder')" class="mui-input" :class="{ 'is-error': errors.email }" />
            <p v-if="errors.email" class="text-sm mt-1 text-danger">{{ errors.email }}</p>
          </div>

          <p v-if="errors.server" class="text-sm text-danger">{{ errors.server }}</p>

          <div class="flex justify-center mt-2">
            <button v-wave class="mui-btn" type="submit" :disabled="loading">
              {{ loading ? $t('forgotPassword.sending') : $t('forgotPassword.sendResetLink') }}
            </button>
          </div>

          <p class="mui-caption text-center mt-2">
            {{ $t('forgotPassword.rememberedPassword') }}
            <NuxtLink to="/login" class="underline hover:no-underline text-primary">{{ $t('common.signIn') }}</NuxtLink>
          </p>
        </form>
      </section>
    </main>
  </div>
</template>
