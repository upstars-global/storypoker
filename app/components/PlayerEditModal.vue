<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
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
  <DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">
    <DialogPortal>
      <DialogOverlay class="mui-modal-overlay">
        <DialogContent
          class="mui-modal-paper"
          style="max-width: 600px; padding: 32px 40px 40px;"
          @pointerdown.stop
          @open-auto-focus="(e) => { e.preventDefault(); nameInput?.focus() }"
        >
          <DialogTitle as="h2" class="text-center text-mui-h2 font-bold text-primary">
            {{ $t('players.editTitle') }}
          </DialogTitle>
          <DialogDescription as="p" class="mui-caption text-center mt-2 text-muted">
            {{ $t('players.editSubtitle') }}
          </DialogDescription>

          <label class="block mt-6">
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

          <section class="mt-5">
            <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
              {{ $t('players.roleLabel') }}
            </h3>
            <div role="radiogroup" class="flex flex-wrap gap-x-5 gap-y-2">
              <label v-for="opt in ROLE_TAGS" :key="opt" class="mui-radio">
                <input
                  v-model="tag"
                  type="radio"
                  name="player-role"
                  :value="opt"
                >
                <span>{{ opt }}</span>
              </label>
            </div>
          </section>

          <div class="flex justify-center mt-8">
            <button v-wave class="mui-btn" style="min-width: 120px;" @click="save">
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
