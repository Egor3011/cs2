<script setup>
import { computed } from 'vue'
const props = defineProps({ match: { type: Object, required: true } })
const statuses = { completed: 'Завершён', live: 'В эфире', ready: 'Ожидает начала', pending: 'Ожидает команды', bye: 'Автопроход', empty: 'Без игры', conditional: 'При необходимости' }
const destination = computed(() => props.match.destinations.find((item) => item.outcome === 'winner'))
const loserDestination = computed(() => props.match.destinations.find((item) => item.outcome === 'loser'))
</script>

<template>
  <article class="tb-match" :class="`tb-match--${match.status}`" :aria-label="`Матч ${match.id}: ${statuses[match.status]}`">
    <header class="tb-match__header">
      <span>{{ match.id }}</span>
      <span :class="{ 'tb-match__live': match.status === 'live' }">{{ statuses[match.status] }}</span>
    </header>
    <div v-for="(slot, index) in match.slots" :key="index" class="tb-match__team"
      :class="{ 'tb-match__winner': slot.team && match.winner?.id === slot.team.id, 'tb-match__placeholder': !slot.team }">
      <span class="tb-match__seed" :aria-label="slot.team ? `Посев ${slot.team.seed}` : undefined">{{ slot.team?.seed ?? '—' }}</span>
      <span class="tb-match__name" :title="slot.team?.name ?? (slot.pending ? slot.label : 'Свободное место')">
        {{ slot.team?.name ?? (slot.pending ? slot.label : 'Свободное место') }}
      </span>
      <span v-if="slot.team && match.winner?.id === slot.team.id" class="tb-match__check" aria-label="Победитель">✓</span>
      <strong class="tb-match__score">{{ match.scores?.[index] ?? '—' }}</strong>
    </div>
    <footer class="tb-match__footer">
      <template v-if="match.status === 'conditional'">Если победит команда нижней сетки</template>
      <template v-else-if="match.status === 'empty'">Нет участников · матч не проводится</template>
      <template v-else-if="match.status === 'bye'">Без игры <span v-if="destination">→ {{ destination.matchId }}</span></template>
      <template v-else>
        <span v-if="destination">Победитель → {{ destination.matchId }}</span>
        <span v-else>Матч за чемпионство</span>
        <span v-if="match.bracket === 'upper' && loserDestination" :title="`Проигравший → ${loserDestination.matchId}`">↓ {{ loserDestination.matchId }}</span>
      </template>
    </footer>
  </article>
</template>

<style scoped>
.tb-match { width: 100%; min-width: 0; color: var(--tb-text); background: var(--tb-card); border: 1px solid var(--tb-border); border-radius: 0; overflow: hidden; font-size: 14px; }
.tb-match__header { min-height: 29px; padding: 6px 10px; display: flex; justify-content: space-between; gap: 8px; color: var(--tb-muted); font-size: 11px; letter-spacing: .02em; border-bottom: 1px solid var(--tb-border); }
.tb-match__header > :first-child { font-family: monospace; }
.tb-match__team { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 5px 10px; }
.tb-match__team + .tb-match__team { border-top: 1px solid var(--tb-border); }
.tb-match__seed { color: var(--tb-muted); min-width: 18px; font-size: 11px; font-variant-numeric: tabular-nums; }
.tb-match__name { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tb-match__score { min-width: 18px; text-align: right; font-variant-numeric: tabular-nums; }
.tb-match__check { color: var(--tb-success); }
.tb-match__placeholder { color: var(--tb-muted); font-size: 12px; }
.tb-match__winner { background: var(--tb-winner-bg); font-weight: 700; }
.tb-match__footer { display: flex; justify-content: space-between; gap: 6px; min-height: 29px; padding: 7px 10px; border-top: 1px solid var(--tb-border); color: var(--tb-muted); font-size: 10px; }
.tb-match--live { border-color: var(--accent); }
.tb-match__live { color: var(--accent); font-weight: 700; }
.tb-match--bye { border-style: dashed; }
.tb-match--empty { background: transparent; }
@media (max-width: 700px) {
  .tb-match__header, .tb-match__footer { font-size: 12px; }
  .tb-match__team { min-height: 44px; font-size: 16px; }
  .tb-match__name { white-space: normal; overflow-wrap: anywhere; }
  .tb-match__placeholder { font-size: 14px; }
}
</style>
