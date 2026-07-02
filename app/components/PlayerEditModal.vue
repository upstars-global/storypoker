<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref } from 'vue'
import AppModal from '~/components/AppModal.vue'
import AppTooltip from '~/components/AppTooltip.vue'
import { PLAYER_ROLES, roleTagForShields, shieldForRoleTag } from '~/utils/shields'

const props = defineProps<{
  name: string
  shields: string[]
}>()

const emit = defineEmits<{
  save: [payload: { name: string; shields: string[] }]
  close: []
}>()

const ROLE_TAGS = PLAYER_ROLES.map(r => r.tag)

const nameValue = ref(props.name)
const nameInput = ref<HTMLInputElement | null>(null)
const tag = ref(roleTagForShields(props.shields) ?? '')

function save() {
  const trimmed = nameValue.value.trim()
  if (!trimmed) return
  const role = tag.value.trim()
  emit('save', { name: trimmed, shields: role ? [shieldForRoleTag(role)] : [] })
}
</script>

<template>
  <AppModal :open="true" @close="emit('close')">
    <div
      class="mui-modal-paper"
      style="max-width: 600px; padding: 32px 40px 40px;"
      @pointerdown.stop
    >
      <h2 class="text-center text-mui-h2 font-bold text-primary">
        {{ $t('players.editTitle') }}
      </h2>
      <p class="mui-caption text-center mt-2 text-muted">
        {{ $t('players.editSubtitle') }}
      </p>

      <section class="mt-6">
        <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
          {{ $t('players.roleLabel') }}
        </h3>
        <div class="flex flex-wrap gap-2">
          <AppTooltip v-for="opt in ROLE_TAGS" :key="opt" side="top" :side-offset="6">
            <template #trigger>
              <button
                type="button"
                class="mui-shield"
                style="padding: 6px 12px;"
                :class="{ 'is-selected': tag === opt }"
                :aria-pressed="tag === opt"
                @click="tag = tag === opt ? '' : opt"
              >
                {{ opt }}
              </button>
            </template>
            <template #content>{{ $t(`players.roleNames.${opt}`, opt) }}</template>
          </AppTooltip>
        </div>
      </section>

      <label class="block mt-5">
        <span class="text-mui-caption font-semibold uppercase tracking-wide text-muted">
          {{ $t('players.nameLabel') }}
        </span>
        <input
          ref="nameInput"
          v-model="nameValue"
          class="mui-input w-full mt-2"
          @keyup.enter="save"
        >
      </label>

      <div class="flex justify-center mt-8">
        <button v-wave class="mui-btn" style="min-width: 120px;" @click="save">
          {{ $t('common.save') }}
        </button>
      </div>
      <button
        v-wave
        class="mui-icon-btn absolute"
        style="top: 12px; right: 12px;"
        :aria-label="$t('common.close')"
        @click="emit('close')"
      >
        <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
      </button>
    </div>
  </AppModal>
</template>
