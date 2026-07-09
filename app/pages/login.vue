<script setup lang="ts">
import { reactive, shallowRef, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { errorMessage, validateEmail, validateRequiredPassword } from '~/utils/authValidation'
import AppHeader from '~/components/AppHeader.vue'
import PasswordInput from '~/components/PasswordInput.vue'

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
  } catch (e) {
    errors.server = errorMessage(e)
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
        <h1 class="mui-h5 text-center">
          {{ $t('common.signIn') }}
        </h1>
        <p class="mui-caption text-center mt-2">
          {{ $t('login.welcome') }}
        </p>

        <form
          class="flex flex-col gap-3 mt-6"
          @submit.prevent="onSubmit"
        >
          <div>
            <div class="mui-field">
              <input
                id="login-email"
                v-model.trim="form.email"
                type="email"
                name="email"
                autocomplete="email"
                placeholder=" "
                class="mui-input"
                :class="{ 'is-error': errors.email }"
                data-testid="login-email"
              >
              <label
                for="login-email"
                class="mui-field-label"
              >
                {{ $t('common.email') }}
              </label>
            </div>
            <p
              v-if="errors.email"
              class="text-sm mt-1 text-danger"
            >
              {{ errors.email }}
            </p>
          </div>

          <div>
            <PasswordInput
              id="login-password"
              v-model="form.password"
              :label="$t('common.password')"
              autocomplete="current-password"
              :error="errors.password"
              testid="login-password"
              @enter="onSubmit"
            />
            <div class="flex items-center justify-between gap-3 mt-1">
              <p
                v-if="errors.password"
                class="text-sm text-danger"
              >
                {{ errors.password }}
              </p>
              <RouterLink
                to="/forgot-password"
                class="mui-caption underline hover:no-underline text-primary ml-auto"
              >
                {{ $t('auth.forgotPassword') }}
              </RouterLink>
            </div>
          </div>

          <p
            v-if="errors.server"
            class="text-sm text-danger"
          >
            {{ errors.server }}
          </p>

          <div class="flex justify-center mt-2">
            <button
              v-wave
              class="mui-btn"
              type="submit"
              :disabled="loading"
              data-testid="login-submit"
            >
              {{ loading ? $t('auth.signingIn') : $t('common.signIn') }}
            </button>
          </div>

          <p class="mui-caption text-center mt-2">
            {{ $t('login.noAccount') }}
            <RouterLink
              to="/signup"
              class="underline hover:no-underline text-primary"
            >
              {{ $t('common.signUp') }}
            </RouterLink>
          </p>
        </form>
      </section>
    </main>
  </div>
</template>
