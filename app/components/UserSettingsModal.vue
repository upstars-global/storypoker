<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, watch, onUnmounted } from 'vue'
import AppModal from '~/components/AppModal.vue'
import AppModalPaper from '~/components/AppModalPaper.vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore } from '~/stores/profiles'
import { useDylanAvatar, avatarDisplayUrl, AVATAR_STYLES, type AvatarStyle } from '~/composables/useDylanAvatar'
import { AVATAR_ACCEPT, processAvatarImage } from '~/utils/avatarImage'

const emit = defineEmits<{
  close: []
}>()

const { user } = storeToRefs(useAuthStore())
const profilesStore = useProfilesStore()
const { avatarDataUri } = useDylanAvatar()
const { t } = useI18n()

const profile = computed(() => (user.value ? profilesStore.get(user.value.id) : null))
const style = ref<AvatarStyle | 'custom'>(
  profile.value?.avatar_url ? 'custom' : (profile.value?.avatar_style ?? 'bottts'),
)
const history = ref<string[]>([profile.value?.avatar_seed ?? user.value?.email ?? randomSeed()])
const cursor = ref(0)
const saving = ref(false)
const error = ref<string | null>(null)
const touched = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)
const pendingBlob = ref<Blob | null>(null)
const pendingObjectUrl = ref<string | null>(null)
const removeRequested = ref(false)

const seed = computed(() => history.value[cursor.value] ?? '')
const dicebearStyle = computed<AvatarStyle>(
  () => style.value === 'custom' ? (profile.value?.avatar_style ?? 'bottts') : style.value,
)
const savedAvatarUrl = computed(() => {
  const saved = profile.value
  return saved?.avatar_url ? avatarDisplayUrl(saved.avatar_url, saved.updated_at) : ''
})
const previewUri = computed(() => {
  if (style.value === 'custom') {
    if (pendingObjectUrl.value) return pendingObjectUrl.value
    return removeRequested.value ? '' : savedAvatarUrl.value
  }
  return seed.value ? avatarDataUri(seed.value, false, dicebearStyle.value) : ''
})
const hasCustomImage = computed(() => Boolean(pendingBlob.value || (!removeRequested.value && profile.value?.avatar_url)))
const canSave = computed(() => style.value !== 'custom' || hasCustomImage.value || removeRequested.value)

watch(profile, (saved) => {
  if (!saved || touched.value) return
  style.value = saved.avatar_url ? 'custom' : saved.avatar_style
  history.value = [saved.avatar_seed]
  cursor.value = 0
})

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

function styleLabel(s: AvatarStyle | 'custom'): string {
  if (s === 'dylan') return t('userSettings.styleDylan')
  if (s === 'miniavs') return t('userSettings.styleMiniavs')
  if (s === 'custom') return t('userSettings.styleCustom')
  return t('userSettings.styleRobots')
}

function selectStyle(next: AvatarStyle | 'custom') {
  if (style.value === next) return
  touched.value = true
  style.value = next
  error.value = null
}

function prev() {
  if (cursor.value > 0) {
    touched.value = true
    cursor.value -= 1
  }
}

function next() {
  touched.value = true
  cursor.value += 1
  if (cursor.value >= history.value.length) {
    history.value.push(randomSeed())
  }
}

function revokePendingUrl() {
  if (pendingObjectUrl.value) {
    URL.revokeObjectURL(pendingObjectUrl.value)
    pendingObjectUrl.value = null
  }
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = null
  try {
    const blob = await processAvatarImage(file)
    revokePendingUrl()
    touched.value = true
    pendingBlob.value = blob
    pendingObjectUrl.value = URL.createObjectURL(blob)
    removeRequested.value = false
  } catch (err: unknown) {
    const code = err instanceof Error ? err.message : ''
    error.value = code === 'file-too-large'
      ? t('userSettings.errorFileTooLarge')
      : code === 'unsupported-type'
        ? t('userSettings.errorUnsupportedType')
        : t('userSettings.errorDecodeFailed')
  }
}

function removeImage() {
  revokePendingUrl()
  touched.value = true
  pendingBlob.value = null
  removeRequested.value = true
}

async function save() {
  if (!user.value || saving.value || !canSave.value) return
  const userId = user.value.id
  saving.value = true
  error.value = null
  try {
    if (style.value === 'custom' && hasCustomImage.value) {
      let avatarUrl = profile.value?.avatar_url ?? null
      if (pendingBlob.value) {
        try {
          avatarUrl = await profilesStore.uploadAvatar(userId, pendingBlob.value)
        } catch {
          error.value = t('userSettings.errorUploadFailed')
          return
        }
      }
      await profilesStore.upsert({
        user_id: userId,
        avatar_style: dicebearStyle.value,
        avatar_seed: seed.value,
        avatar_url: avatarUrl,
      })
    } else {
      const hadStoredAvatar = Boolean(profile.value?.avatar_url)
      await profilesStore.upsert({
        user_id: userId,
        avatar_style: dicebearStyle.value,
        avatar_seed: seed.value,
        avatar_url: null,
      })
      if (hadStoredAvatar) {
        await profilesStore.removeAvatar(userId).catch(() => undefined)
      }
    }
    emit('close')
  } catch {
    error.value = t('userSettings.saveError')
  } finally {
    saving.value = false
  }
}

onUnmounted(revokePendingUrl)
</script>

<template>
  <AppModal
    labelledby="user-settings-modal-title"
    :open="true"
    @close="emit('close')"
  >
    <AppModalPaper
      style="max-width: 560px; padding: 32px 40px 40px;"
      @close="emit('close')"
    >
      <h2
        id="user-settings-modal-title"
        class="text-center text-mui-h2 font-bold text-primary"
      >
        {{ $t('userSettings.title') }}
      </h2>

      <div class="mt-6 flex flex-wrap justify-center gap-2">
        <button
          v-for="s in [...AVATAR_STYLES, 'custom' as const]"
          :key="s"
          v-wave
          class="mui-btn"
          :class="{ 'mui-btn-secondary': style !== s }"
          style="min-width: 120px;"
          @click="selectStyle(s)"
        >
          {{ styleLabel(s) }}
        </button>
      </div>

      <div
        v-if="style !== 'custom'"
        class="mt-6 flex items-center justify-center gap-4"
      >
        <button
          v-wave
          class="mui-btn mui-btn-secondary"
          style="min-width: inherit;"
          :aria-label="$t('userSettings.previousAvatar')"
          :disabled="cursor === 0"
          @click="prev"
        >
          <AppIcon
            class="mui-svg-icon"
            icon="ic:baseline-navigate-before"
            style="font-size: 1.25rem;"
          />
        </button>
        <img
          v-if="previewUri"
          :src="previewUri"
          :alt="$t('userSettings.avatarPreview')"
          class="rounded-full"
          style="width: 144px; height: 144px;"
        >
        <button
          v-wave
          class="mui-btn mui-btn-secondary"
          style="min-width: inherit;"
          :aria-label="$t('userSettings.nextAvatar')"
          @click="next"
        >
          <AppIcon
            class="mui-svg-icon"
            icon="ic:baseline-navigate-next"
            style="font-size: 1.25rem;"
          />
        </button>
      </div>

      <div
        v-else
        class="mt-6 flex flex-col items-center gap-4"
      >
        <input
          ref="fileInput"
          type="file"
          :accept="AVATAR_ACCEPT"
          class="hidden"
          @change="onFileSelected"
        >
        <button
          v-wave
          class="rounded-full overflow-hidden flex items-center justify-center bg-skeleton"
          style="width: 144px; height: 144px;"
          :aria-label="$t('userSettings.chooseFile')"
          @click="fileInput?.click()"
        >
          <img
            v-if="previewUri"
            :src="previewUri"
            :alt="$t('userSettings.avatarPreview')"
            style="width: 100%; height: 100%; object-fit: cover;"
          >
          <AppIcon
            v-else
            class="mui-svg-icon text-muted"
            icon="ic:baseline-add-a-photo"
            style="font-size: 3rem;"
          />
        </button>
        <div class="flex items-center gap-2">
          <button
            v-wave
            class="mui-btn mui-btn-secondary"
            @click="fileInput?.click()"
          >
            {{ $t('userSettings.chooseFile') }}
          </button>
          <button
            v-if="hasCustomImage"
            v-wave
            class="mui-btn mui-btn-text"
            @click="removeImage"
          >
            {{ $t('userSettings.removeImage') }}
          </button>
        </div>
      </div>

      <p
        v-if="error"
        class="text-mui-caption mt-4 text-center text-danger"
      >
        {{ error }}
      </p>

      <div class="flex justify-center mt-8">
        <button
          v-wave
          class="mui-btn"
          style="min-width: 120px;"
          :disabled="saving || !canSave"
          @click="save"
        >
          {{ $t('common.save') }}
        </button>
      </div>
    </AppModalPaper>
  </AppModal>
</template>
