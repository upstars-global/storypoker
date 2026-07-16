<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppModal from '~/components/AppModal.vue'
import AppModalPaper from '~/components/AppModalPaper.vue'
import RolePicker from '~/components/RolePicker.vue'
import { roleTagForShields, shieldForRoleTag } from '~/utils/shields'

const props = defineProps<{
  name: string
  shields: string[]
}>()

const emit = defineEmits<{
  save: [payload: { name: string; shields: string[] }]
  close: []
}>()

const nameValue = ref(props.name)
const nameInput = ref<HTMLInputElement | null>(null)
const tag = ref(roleTagForShields(props.shields) ?? '')

onMounted(() => nameInput.value?.focus())

function save() {
  const trimmed = nameValue.value.trim()
  if (!trimmed) return
  const role = tag.value.trim()
  emit('save', { name: trimmed, shields: role ? [shieldForRoleTag(role)] : [] })
}
</script>

<template>
  <AppModal
    labelledby="player-edit-modal-title"
    :open="true"
    @close="emit('close')"
  >
    <AppModalPaper
      style="max-width: 600px; padding: 32px 40px 40px;"
      @close="emit('close')"
    >
      <h2
        id="player-edit-modal-title"
        class="text-center text-mui-h2 font-bold text-primary"
      >
        {{ $t('players.editTitle') }}
      </h2>
      <p class="mui-caption text-center mt-2 text-muted">
        {{ $t('players.editSubtitle') }}
      </p>

      <RolePicker
        v-model="tag"
        class="mt-6"
      />

      <div class="mui-field mt-5">
        <input
          id="player-name"
          ref="nameInput"
          v-model="nameValue"
          name="name"
          autocomplete="name"
          placeholder=" "
          class="mui-input w-full"
          @keyup.enter="save"
        >
        <label
          for="player-name"
          class="mui-field-label"
        >
          {{ $t('players.nameLabel') }}
        </label>
      </div>

      <div class="flex justify-center mt-8">
        <button
          v-wave
          class="mui-btn"
          style="min-width: 120px;"
          @click="save"
        >
          {{ $t('common.save') }}
        </button>
      </div>
    </AppModalPaper>
  </AppModal>
</template>
