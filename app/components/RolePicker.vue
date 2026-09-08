<script setup lang="ts">
import RoleBadge from '~/components/RoleBadge.vue'
import { PLAYER_ROLE_GROUPS } from '~/utils/shields'

const model = defineModel<string>({ required: true })

const ROLE_TAG_GROUPS = PLAYER_ROLE_GROUPS.map(group => group.map(r => r.tag))

function toggle(tag: string) {
  model.value = model.value === tag ? '' : tag
}
</script>

<template>
  <section>
    <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
      {{ $t('players.roleLabel') }}
    </h3>
    <div class="flex flex-wrap gap-x-5 gap-y-2">
      <div
        v-for="(group, i) in ROLE_TAG_GROUPS"
        :key="i"
        class="flex flex-wrap gap-2"
      >
        <RoleBadge
          v-for="opt in group"
          :key="opt"
          :tag="opt"
          interactive
          :selected="model === opt"
          @select="toggle(opt)"
        />
      </div>
    </div>
  </section>
</template>
