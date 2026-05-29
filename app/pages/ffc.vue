<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue'
import { onMounted, ref } from 'vue'
import AuthModal from '~/components/AuthModal.vue'
import UserSettingsModal from '~/components/UserSettingsModal.vue'
import { useProfilesStore } from '~/stores/profiles'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import {
  getFeatureFlags,
  setFeatureFlagValue,
  type FeatureFlags,
  type FeatureFlagKey, resetFeatureFlagValues,
} from '~/configs/featureFlags'

const authStore = useAuthStore()

const origin = ref('')
const showAuth = ref<'signin' | 'signup' | null>(null)
const showAccountSettings = ref(false)
const profilesStore = useProfilesStore()
const { user } = storeToRefs(authStore)

const featureFlags = ref<FeatureFlags>(getFeatureFlags())

onMounted(async () => {
  origin.value = window.location.origin
  await authStore.init()
  if (user.value?.id) await profilesStore.fetchOne(user.value.id)
})

function toggleFeatureFlag(key: FeatureFlagKey) {
  const newValue = !featureFlags.value[key].enabled
  setFeatureFlagValue(key, newValue)
  featureFlags.value[key].enabled = newValue
}

function resetFeatureFlags() {
  resetFeatureFlagValues()
  featureFlags.value = getFeatureFlags()
}

</script>

<template>
  <div class="min-h-screen flex flex-col bg-app text-body">
    <AppHeader
      :online-count="0"
      :is-moderator="false"
      :player-name="''"
      :title="$t('ffc.title')"
      @open-sign-in="showAuth = 'signin'"
      @open-sign-up="showAuth = 'signup'"
      @open-account-settings="showAccountSettings = true"
      @sign-out="authStore.signOut()"
    />

    <AuthModal
      v-if="showAuth"
      :mode="showAuth"
      @close="showAuth = null"
      @success="showAuth = null"
    />

    <UserSettingsModal
      v-if="showAccountSettings && user"
      @close="showAccountSettings = false"
    />
    <main class="flex flex-col gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto">
      <div class="w-full grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-6">
        <div
          v-for="(featureFlagValue, featureFlagKey) in featureFlags"
          :key="featureFlagKey"
          class="mui-paper"
        >
          <div class="mui-paper-header">
            <div class="flex items-center justify-between w-full">
              <div>{{ $t(`ffc.flags.${featureFlagKey}.name`) }}</div>
              <span
                class="mui-switch"
                @click="toggleFeatureFlag(featureFlagKey)"
              >
                <input
                  type="checkbox"
                  :checked="featureFlagValue.enabled"
                >
                <span class="track" />
                <span class="thumb" />
              </span>
            </div>
          </div>
          <div class="pl-4 pr-2 py-2 gap-2 flex flex-col">
            <div>{{ $t(`ffc.flags.${featureFlagKey}.description`) }}</div>
          </div>
        </div>
        <div
          v-if="featureFlags.example.enabled"
          class="mui-paper"
        >
          <div class="mui-paper-header">
            <div>{{ $t('ffc.exampleHeader') }}</div>
          </div>
          <div class="pl-4 pr-2 py-2">
            {{ $t('ffc.exampleText') }}
          </div>
        </div>
      </div>
      <div>
        <button
          v-wave
          class="mui-btn"
          @click="resetFeatureFlags"
        >
          {{ $t('ffc.resetFeatureFlags') }}
        </button>
      </div>
    </main>
  </div>
</template>
