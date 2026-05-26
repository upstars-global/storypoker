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
import { SHIELD_GROUPS, MAX_SHIELDS, shieldsForGroup, type Shield } from '~/utils/shields'

const props = defineProps<{
  shields: string[]
}>()

const emit = defineEmits<{
  save: [shields: string[]]
  close: []
}>()

const selected = ref<string[]>([...props.shields])

function toggle(shield: Shield) {
  if (selected.value.includes(shield.id)) {
    selected.value = selected.value.filter(id => id !== shield.id)
    return
  }
  const groupIds = shieldsForGroup(shield.group).map(s => s.id)
  selected.value = [...selected.value.filter(id => !groupIds.includes(id)), shield.id]
}

function save() {
  emit('save', selected.value)
}
</script>

<template>
  <DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">
    <DialogPortal>
      <DialogOverlay class="mui-modal-overlay">
        <DialogContent class="mui-modal-paper" style="max-width: 600px; padding: 32px 40px 40px;">
          <DialogTitle as="h2" class="text-center text-mui-h2 font-bold text-primary">
            {{ $t('shields.title') }}
          </DialogTitle>
          <DialogDescription as="p" class="mui-caption text-center mt-2 text-muted">
            {{ $t('shields.subtitle', { count: selected.length, max: MAX_SHIELDS }) }}
          </DialogDescription>

          <div class="mt-6 flex flex-col gap-5">
            <section v-for="group in SHIELD_GROUPS" :key="group">
              <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
                {{ $t(`shields.groups.${group}`) }}
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="shield in shieldsForGroup(group)"
                  :key="shield.id"
                  v-wave
                  type="button"
                  class="mui-shield"
                  :class="{ 'is-selected': selected.includes(shield.id) }"
                  @click="toggle(shield)"
                >
                  <Icon :icon="shield.icon" style="font-size: 1.125rem;" />
                  {{ $t(shield.labelKey) }}
                </button>
              </div>
            </section>
          </div>

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
