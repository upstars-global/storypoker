<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{
  id: string
  label: string
  autocomplete: 'current-password' | 'new-password'
  name?: string
  error?: string
  testid?: string
}>(), {
  name: 'password',
  error: '',
  testid: undefined,
})

const model = defineModel<string>({ required: true })

const emit = defineEmits<{
  enter: []
}>()

const { t } = useI18n()
const visible = ref(false)
</script>

<template>
  <div class="mui-field">
    <input
      :id="id"
      v-model="model"
      :type="visible ? 'text' : 'password'"
      :name="name"
      :autocomplete="autocomplete"
      placeholder=" "
      class="mui-input pr-12"
      :class="{ 'is-error': error }"
      :data-testid="testid"
      @keyup.enter="emit('enter')"
    >
    <label
      :for="id"
      class="mui-field-label"
    >
      {{ label }}
    </label>
    <button
      type="button"
      class="mui-field-adornment"
      :aria-label="visible ? t('common.hidePassword') : t('common.showPassword')"
      :aria-pressed="visible"
      tabindex="-1"
      @click="visible = !visible"
    >
      <AppIcon :icon="visible ? 'ic:baseline-visibility-off' : 'ic:baseline-visibility'" />
    </button>
  </div>
</template>
