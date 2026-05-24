<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import { CHIP_GROUPS, MAX_CHIPS, chipsForGroup } from '~/utils/chips'

const props = defineProps<{
  chips: string[]
}>()

const emit = defineEmits<{
  save: [chips: string[]]
  close: []
}>()

const selected = ref<string[]>([...props.chips])

const isFull = computed(() => selected.value.length >= MAX_CHIPS)

function toggle(id: string) {
  if (selected.value.includes(id)) {
    selected.value = selected.value.filter(c => c !== id)
  } else if (!isFull.value) {
    selected.value = [...selected.value, id]
  }
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
            {{ $t('chips.title') }}
          </DialogTitle>
          <DialogDescription as="p" class="mui-caption text-center mt-2 text-muted">
            {{ $t('chips.subtitle', { count: selected.length, max: MAX_CHIPS }) }}
          </DialogDescription>

          <div class="mt-6 flex flex-col gap-5">
            <section v-for="group in CHIP_GROUPS" :key="group">
              <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
                {{ $t(`chips.groups.${group}`) }}
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="chip in chipsForGroup(group)"
                  :key="chip.id"
                  v-wave
                  type="button"
                  class="mui-chip"
                  :class="{ 'is-selected': selected.includes(chip.id), 'is-lead': group === 'lead' }"
                  :disabled="isFull && !selected.includes(chip.id)"
                  @click="toggle(chip.id)"
                >
                  <Icon :icon="chip.icon" style="font-size: 1.125rem;" />
                  {{ $t(chip.labelKey) }}
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
