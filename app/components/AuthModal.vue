<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { validateEmail, validatePasswordConfirmation, validateRequiredPassword } from '~/utils/authValidation'

const props = defineProps<{
  mode: 'signin' | 'signup'
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { signIn, signUp } = useAuthStore()
const email = ref('')
const password = ref('')
const confirm = ref('')
const errors = reactive<{ email?: string; password?: string; confirm?: string; server?: string }>({})
const loading = ref(false)

function validate() {
  errors.email = validateEmail(email.value)
  errors.password = validateRequiredPassword(password.value)
  errors.confirm = props.mode === 'signup'
    ? validatePasswordConfirmation(password.value, confirm.value)
    : undefined
  return !errors.email && !errors.password && !errors.confirm
}

async function submit() {
  errors.server = undefined
  if (!validate()) return

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
    errors.server = e.message ?? 'Something went wrong'
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
        :aria-label="$t('common.close')"
        @click="emit('close')"
      >
        <Icon class="mui-svg-icon" name="app:close" style="font-size: 1.5rem;" />
      </button>
      <h2 class="mui-h5 text-center">
        {{ mode === 'signin' ? $t('common.signIn') : $t('common.signUp') }}
      </h2>
      <p
        v-if="mode === 'signup'"
        class="mui-caption text-center mt-2 text-muted"
      >
        {{ $t('auth.gainModeratorPowers') }}
      </p>
      <div class="flex flex-col gap-3 mt-6">
        <div>
          <input
            v-model.trim="email"
            type="email"
            :placeholder="$t('common.emailPlaceholder')"
            autocomplete="email"
            class="mui-input"
            :class="{ 'is-error': errors.email }"
            @keyup.enter="submit"
          />
          <p v-if="errors.email" class="text-sm mt-1 text-danger">{{ errors.email }}</p>
        </div>

        <div>
          <div v-if="mode === 'signin'" class="flex items-center justify-between gap-3 mb-1">
            <span class="mui-caption">{{ $t('common.password') }}</span>
            <NuxtLink to="/forgot-password" class="mui-caption underline hover:no-underline text-primary" @click="emit('close')">
              {{ $t('auth.forgotPassword') }}
            </NuxtLink>
          </div>
          <input
            v-model="password"
            type="password"
            :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
            :placeholder="$t('common.passwordPlaceholder')"
            class="mui-input"
            :class="{ 'is-error': errors.password }"
            @keyup.enter="submit"
          />
          <p v-if="errors.password" class="text-sm mt-1 text-danger">{{ errors.password }}</p>
        </div>

        <div v-if="mode === 'signup'">
          <input
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            :placeholder="$t('common.confirmPasswordPlaceholder')"
            class="mui-input"
            :class="{ 'is-error': errors.confirm }"
            @keyup.enter="submit"
          />
          <p v-if="errors.confirm" class="text-sm mt-1 text-danger">{{ errors.confirm }}</p>
        </div>

        <p v-if="errors.server" class="text-sm text-danger">{{ errors.server }}</p>
        <div class="flex justify-center mt-2">
          <button class="mui-btn" :disabled="loading" @click="submit">
            {{ loading ? (mode === 'signin' ? $t('auth.signingIn') : $t('auth.signingUp')) : (mode === 'signin' ? $t('common.signIn') : $t('common.signUp')) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
