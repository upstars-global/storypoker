<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui'
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
  <DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">
    <DialogPortal>
      <DialogOverlay class="mui-modal-overlay">
        <DialogContent
          class="mui-modal-paper"
          @pointerdown.stop
          @escape-key-down="(e) => e.preventDefault()"
          @interact-outside="(e) => e.preventDefault()"
        >
          <DialogTitle as="h2" class="mui-h5 text-center">{{ $t('join.title') }}</DialogTitle>
          <DialogDescription as="p" class="mui-caption text-center mt-2 text-muted">
            {{ $t('join.subtitle') }}
          </DialogDescription>
          <div class="flex flex-col gap-4 mt-6">
            <input
              v-model="name"
              type="text"
              :placeholder="$t('join.namePlaceholder')"
              class="mui-input w-full"
              :class="{ 'is-error': hasError }"
              @keyup.enter="submit"
            />
            <section>
              <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
                {{ $t('players.roleLabel') }}
              </h3>
              <div class="flex flex-wrap gap-2">
                <TooltipRoot v-for="opt in ROLE_TAGS" :key="opt">
                  <TooltipTrigger as-child>
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
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
                      {{ $t(`players.roleNames.${opt}`, opt) }}
                    </TooltipContent>
                  </TooltipPortal>
                </TooltipRoot>
              </div>
            </section>
            <div class="flex justify-center">
              <button class="mui-btn" @click="submit">{{ $t('join.joinRoom') }}</button>
            </div>
          </div>
          <DialogClose
            v-wave
            class="mui-icon-btn absolute"
            style="top: 8px; right: 8px;"
            :aria-label="$t('common.close')"
          >
            <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
          </DialogClose>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </DialogRoot>
</template>
