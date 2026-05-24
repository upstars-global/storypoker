<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { useProfilesStore } from '~/stores/profiles'
import { useDylanAvatar, AVATAR_STYLES, type AvatarStyle } from '~/composables/useDylanAvatar'

const emit = defineEmits<{
  close: []
}>()

const { user } = storeToRefs(useAuthStore())
const profilesStore = useProfilesStore()
const { avatarDataUri } = useDylanAvatar()
const { t } = useI18n()

const initial = user.value ? profilesStore.get(user.value.id) : null
const style = ref<AvatarStyle>(initial?.avatar_style ?? 'bottts')
const history = ref<string[]>([initial?.avatar_seed ?? user.value?.email ?? randomSeed()])
const cursor = ref(0)
const saving = ref(false)
const error = ref<string | null>(null)

const seed = computed(() => history.value[cursor.value] ?? '')
const previewUri = computed(() => seed.value ? avatarDataUri(seed.value, false, style.value) : '')

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

function selectStyle(next: AvatarStyle) {
  if (style.value === next) return
  style.value = next
}

function prev() {
  if (cursor.value > 0) cursor.value -= 1
}

function next() {
  cursor.value += 1
  if (cursor.value >= history.value.length) {
    history.value.push(randomSeed())
  }
}

async function save() {
  if (!user.value || saving.value) return
  saving.value = true
  error.value = null
  try {
    await profilesStore.upsert({
      user_id: user.value.id,
      avatar_style: style.value,
      avatar_seed: seed.value,
    })
    emit('close')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : t('userSettings.saveError')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">
    <DialogPortal>
      <DialogOverlay class="mui-modal-overlay">
        <DialogContent class="mui-modal-paper" style="max-width: 420px; padding: 32px 40px 40px;">
          <DialogTitle as="h2" class="text-center text-mui-h2 font-bold text-primary">
            {{ $t('userSettings.title') }}
          </DialogTitle>

          <div class="mt-6 flex justify-center gap-2">
            <button
              v-for="s in AVATAR_STYLES"
              :key="s"
              v-wave
              class="mui-btn"
              :class="{ 'mui-btn-secondary': style !== s }"
              style="min-width: 120px;"
              @click="selectStyle(s)"
            >
              {{ s === 'bottts' ? $t('userSettings.styleRobots') : s === 'dylan' ? $t('userSettings.styleDylan') : $t('userSettings.styleMiniavs') }}
            </button>
          </div>

          <div class="mt-6 flex items-center justify-center gap-4">
            <button
              v-wave
              class="mui-btn mui-btn-secondary"
              style="min-width: inherit;"
              :aria-label="$t('userSettings.previousAvatar')"
              :disabled="cursor === 0"
              @click="prev"
            >
              <Icon class="mui-svg-icon" icon="ic:baseline-navigate-before" style="font-size: 1.25rem;" />
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
              <Icon class="mui-svg-icon" icon="ic:baseline-navigate-next" style="font-size: 1.25rem;" />
            </button>
          </div>

          <p v-if="error" class="text-mui-caption mt-4 text-center text-danger">{{ error }}</p>

          <div class="flex justify-center mt-8">
            <button v-wave class="mui-btn" style="min-width: 120px;" :disabled="saving" @click="save">
              {{ $t('common.save') }}
            </button>
          </div>
          <DialogClose
            v-wave
            class="mui-icon-btn absolute"
            style="top: 12px; right: 12px;"
            :aria-label="$t('common.close')"
          >
            <Icon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
          </DialogClose>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </DialogRoot>
</template>
