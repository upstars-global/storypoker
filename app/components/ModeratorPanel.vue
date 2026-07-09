<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import { votingProgress, type VotingGroupKey } from '~/utils/votingProgress'

const props = defineProps<{
  players: Array<{
    id: string
    name: string
    vote: string | null
    shields: string[]
  }>
}>()

const emit = defineEmits<{
  nudge: []
}>()

const GROUP_LABEL_KEYS: Record<VotingGroupKey, string> = {
  dev: 'moderatorPanel.groupDev',
  qa: 'moderatorPanel.groupQa',
  other: 'moderatorPanel.groupOther',
}

const progress = computed(() => votingProgress(props.players))
const showGroups = computed(() =>
  progress.value.groups.length > 1 || (progress.value.groups.length === 1 && progress.value.groups[0]?.key !== 'other')
)
const allVoted = computed(() => progress.value.total > 0 && progress.value.voted === progress.value.total)

const nudgeCooldown = ref(false)

function sendNudge() {
  if (nudgeCooldown.value) return
  emit('nudge')
  nudgeCooldown.value = true
  setTimeout(() => { nudgeCooldown.value = false }, 5000)
}
</script>

<template>
  <div
    class="mui-paper w-full max-w-[640px] mx-auto mb-8"
    data-testid="moderator-panel"
  >
    <div class="mui-paper-header">
      {{ $t('moderatorPanel.title') }}
    </div>
    <div class="p-4 flex flex-col gap-4">
      <div>
        <div class="flex items-baseline justify-between mb-1.5">
          <span class="text-mui-body text-body">{{ $t('moderatorPanel.voted') }}</span>
          <span
            class="text-mui-body font-medium text-primary tabular-nums"
            data-testid="moderator-panel-total"
          >
            {{ progress.voted }} / {{ progress.total }} · {{ progress.percent }}%
          </span>
        </div>
        <div
          class="h-2.5 rounded-full overflow-hidden bg-skeleton"
          role="progressbar"
          :aria-valuenow="progress.percent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="h-full rounded-full"
            :style="{
              width: `${progress.percent}%`,
              backgroundColor: allVoted ? 'var(--success)' : 'var(--primary)',
              transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            }"
          />
        </div>
      </div>

      <div
        v-if="showGroups"
        class="flex flex-col gap-2.5"
      >
        <div
          v-for="group in progress.groups"
          :key="group.key"
          :data-testid="`moderator-panel-group-${group.key}`"
        >
          <div class="flex items-baseline justify-between mb-1">
            <span class="text-mui-caption text-muted">{{ $t(GROUP_LABEL_KEYS[group.key]) }}</span>
            <span class="text-mui-caption text-muted tabular-nums">
              {{ group.voted }} / {{ group.total }} · {{ group.percent }}%
            </span>
          </div>
          <div class="h-1.5 rounded-full overflow-hidden bg-skeleton">
            <div
              class="h-full rounded-full"
              :style="{
                width: `${group.percent}%`,
                backgroundColor: group.voted === group.total ? 'var(--success)' : 'var(--primary)',
                transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              }"
            />
          </div>
        </div>
      </div>

      <p
        v-if="allVoted"
        class="m-0 text-mui-body text-success"
        data-testid="moderator-panel-all-voted"
      >
        {{ $t('moderatorPanel.allVoted') }}
      </p>
      <div
        v-else-if="progress.waiting.length"
        class="flex flex-wrap items-center gap-2"
      >
        <span class="text-mui-caption text-muted">{{ $t('moderatorPanel.waitingFor') }}:</span>
        <span
          v-for="p in progress.waiting"
          :key="p.id"
          class="mui-shield-tag border"
          data-testid="moderator-panel-waiting"
        >
          {{ p.name }}
        </span>
        <button
          v-wave
          class="mui-btn mui-btn-sm mui-btn-text ml-auto inline-flex items-center gap-1.5"
          :disabled="nudgeCooldown"
          data-testid="moderator-panel-nudge"
          @click="sendNudge"
        >
          <AppIcon
            icon="ic:baseline-notifications-active"
            style="font-size: 1.1rem;"
          />
          {{ nudgeCooldown ? $t('moderatorPanel.nudged') : $t('moderatorPanel.nudge') }}
        </button>
      </div>
    </div>
  </div>
</template>
