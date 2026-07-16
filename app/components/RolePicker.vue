<script setup lang="ts">
import RoleBadge from '~/components/RoleBadge.vue'
import { PLAYER_ROLES } from '~/utils/shields'

const model = defineModel<string>({ required: true })

const ROLE_TAGS = PLAYER_ROLES.map(r => r.tag)

function toggle(tag: string) {
  model.value = model.value === tag ? '' : tag
}
</script>

<template>
  <section>
    <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
      {{ $t('players.roleLabel') }}
    </h3>
    <div class="flex flex-wrap gap-2">
      <RoleBadge
        v-for="opt in ROLE_TAGS"
        :key="opt"
        :tag="opt"
        interactive
        :selected="model === opt"
        @select="toggle(opt)"
      />
    </div>
  </section>
</template>
