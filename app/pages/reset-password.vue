<script setup lang="ts">
import { getSupabase } from '~/lib/supabase-instance'
import { useAuthStore } from '~/stores/auth'
import { validatePasswordConfirmation, validateRequiredPassword } from '~/utils/authValidation'

const { t } = useI18n()
useHead({ title: t('resetPassword.pageTitle') })

const authStore = useAuthStore()
const router = useRouter()

const form = reactive({ password: '', confirm: '' })
const errors = reactive<{ password?: string; confirm?: string; server?: string; session?: string }>({})
const loading = shallowRef(false)
const checkingSession = shallowRef(true)
const canReset = shallowRef(false)
const success = shallowRef(false)
let authSubscription: { unsubscribe: () => void } | undefined

function validate() {
  errors.password = validateRequiredPassword(form.password)
  errors.confirm = validatePasswordConfirmation(form.password, form.confirm)
  return !errors.password && !errors.confirm
}

onMounted(async () => {
  await authStore.init()
  const supabase = getSupabase()
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
      canReset.value = Boolean(session)
      errors.session = canReset.value ? undefined : errors.session
    }
  })
  authSubscription = authListener.subscription

  const { data } = await supabase.auth.getSession()
  canReset.value = Boolean(data.session)
  errors.session = canReset.value ? undefined : t('resetPassword.openLink')
  checkingSession.value = false
})

onUnmounted(() => {
  authSubscription?.unsubscribe()
})

async function onSubmit() {
  errors.server = undefined
  if (!validate()) return

  loading.value = true
  try {
    await authStore.updatePassword(form.password)
    await authStore.signOut()
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
        <h1 class="mui-h5 text-center">{{ $t('resetPassword.title') }}</h1>
        <p class="mui-caption text-center mt-2">{{ $t('resetPassword.description') }}</p>

        <div v-if="checkingSession" class="text-center mt-6">
          <p class="mui-body">{{ $t('resetPassword.checking') }}</p>
        </div>

        <div v-else-if="success" class="text-center mt-6">
          <p class="mui-body">{{ $t('resetPassword.updated') }}</p>
          <NuxtLink to="/login" class="mui-caption underline hover:no-underline text-primary">{{ $t('common.signIn') }}</NuxtLink>
        </div>

        <div v-else-if="!canReset" class="text-center mt-6">
          <p class="mui-body">{{ errors.session }}</p>
          <NuxtLink to="/forgot-password" class="mui-caption underline hover:no-underline text-primary">{{ $t('resetPassword.requestNewLink') }}</NuxtLink>
        </div>

        <form v-else class="flex flex-col gap-3 mt-6" @submit.prevent="onSubmit">
          <div>
            <input v-model="form.password" type="password" autocomplete="new-password" :placeholder="$t('resetPassword.newPasswordPlaceholder')" class="mui-input" :class="{ 'is-error': errors.password }" />
            <p v-if="errors.password" class="text-sm mt-1 text-danger">{{ errors.password }}</p>
          </div>

          <div>
            <input v-model="form.confirm" type="password" autocomplete="new-password" :placeholder="$t('resetPassword.confirmNewPasswordPlaceholder')" class="mui-input" :class="{ 'is-error': errors.confirm }" />
            <p v-if="errors.confirm" class="text-sm mt-1 text-danger">{{ errors.confirm }}</p>
          </div>

          <p v-if="errors.server" class="text-sm text-danger">{{ errors.server }}</p>

          <div class="flex justify-center mt-2">
            <button v-wave class="mui-btn" type="submit" :disabled="loading">
              {{ loading ? $t('resetPassword.updating') : $t('resetPassword.updatePassword') }}
            </button>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>
