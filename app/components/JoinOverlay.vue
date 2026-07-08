<script setup lang="ts">
import { ref } from 'vue'
import AppModal from '~/components/AppModal.vue'
import AppModalPaper from '~/components/AppModalPaper.vue'
import AppTooltip from '~/components/AppTooltip.vue'
import { PLAYER_ROLES, shieldForRoleTag } from '~/utils/shields'

const emit = defineEmits<{
  join: [payload: { name: string; shields: string[] }]
  close: []
}>()

const ROLE_TAGS = PLAYER_ROLES.map(r => r.tag)

const name = ref('')
const tag = ref('')
const hasError = ref(false)

function submit() {
  if (!name.value.trim()) {
    hasError.value = true
    return
  }
  const role = tag.value.trim()
  emit('join', { name: name.value.trim(), shields: role ? [shieldForRoleTag(role)] : [] })
}
</script>

<template>
  <AppModal
    labelledby="join-overlay-title"
    :open="true"
    lock-dismiss
    @close="emit('close')"
  >
    <AppModalPaper @close="emit('close')">
      <h2
        id="join-overlay-title"
        class="mui-h5 text-center"
      >
        {{ $t('join.title') }}
      </h2>
      <p class="mui-caption text-center mt-2 text-muted">
        {{ $t('join.subtitle') }}
      </p>
      <div class="flex flex-col gap-4 mt-6">
        <input
          id="join-name"
          v-model="name"
          type="text"
          name="name"
          autocomplete="name"
          :placeholder="$t('join.namePlaceholder')"
          class="mui-input w-full"
          :class="{ 'is-error': hasError }"
          @keyup.enter="submit"
        >
        <section>
          <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
            {{ $t('players.roleLabel') }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <AppTooltip
              v-for="opt in ROLE_TAGS"
              :key="opt"
              side="top"
              :side-offset="6"
            >
              <template #trigger>
                <button
                  type="button"
                  class="mui-shield mui-shield-tag"
                  :class="{ 'is-selected': tag === opt }"
                  :aria-pressed="tag === opt"
                  @click="tag = tag === opt ? '' : opt"
                >
                  {{ opt }}
                </button>
              </template>
              <template #content>
                {{ $t(`players.roleNames.${opt}`, opt) }}
              </template>
            </AppTooltip>
          </div>
        </section>
        <div class="flex justify-center">
          <button
            class="mui-btn"
            @click="submit"
          >
            {{ $t('join.joinRoom') }}
          </button>
        </div>
      </div>
    </AppModalPaper>
  </AppModal>
</template>
