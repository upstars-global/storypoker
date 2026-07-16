<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import AppModal from '~/components/AppModal.vue'
import AppModalPaper from '~/components/AppModalPaper.vue'
import RolePicker from '~/components/RolePicker.vue'
import { shieldForRoleTag } from '~/utils/shields'

const props = defineProps<{
  roomName?: string | null
}>()

const emit = defineEmits<{
  join: [payload: { name: string; shields: string[] }]
  close: []
}>()

const name = ref('')
const tag = ref('')
const hasError = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await nextTick()
  nameInput.value?.focus()
})

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
      <p class="mui-body text-center mt-1 text-body">
        {{ props.roomName ? $t('join.subtitleNamed', { name: props.roomName }) : $t('join.subtitle') }}
      </p>
      <div class="flex flex-col gap-4 mt-6">
        <div class="mui-field">
          <input
            id="join-name"
            ref="nameInput"
            v-model="name"
            type="text"
            name="name"
            autocomplete="name"
            placeholder=" "
            class="mui-input w-full"
            :class="{ 'is-error': hasError }"
            @keyup.enter="submit"
          >
          <label
            for="join-name"
            class="mui-field-label"
          >
            {{ $t('join.nameLabel') }}
          </label>
        </div>
        <RolePicker v-model="tag" />
        <div class="flex justify-center">
          <button
            v-wave
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
