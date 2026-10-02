<script setup>
import { computed, ref, watch } from 'vue'
import BracketMatchCard from './BracketMatchCard.vue'
const props = defineProps({ rounds: { type: Array, required: true }, title: { type: String, required: true }, description: { type: String, default: '' }, kind: { type: String, required: true } })
const activeRound = ref(0)
watch(() => props.rounds.length, () => { activeRound.value = Math.min(activeRound.value, Math.max(0, props.rounds.length - 1)) })
const rows = computed(() => Math.max(1, ...props.rounds.map((round) => round.matches.length)))
const width = computed(() => props.rounds.length * 300 - 40)
const height = computed(() => rows.value * 156)
const paths = computed(() => {
  const positions = new Map()
  props.rounds.forEach((round, column) => round.matches.forEach((match, index) => {
    positions.set(match.id, { x: column * 300, y: (index + .5) * height.value / round.matches.length })
  }))
  return props.rounds.flatMap((round) => round.matches.flatMap((match) => match.slots.flatMap((slot) => {
    const from = positions.get(slot.source?.matchId)
    const to = positions.get(match.id)
    if (!from) return []
    const start = from.x + 260
    return [{ id: `${slot.source.matchId}-${match.id}-${slot.source.outcome}`, d: `M ${start} ${from.y} H ${start + 20} V ${to.y} H ${to.x}` }]
  })))
})
</script>

<template>
  <section class="tb-stage" :class="`tb-stage--${kind}`" :aria-label="title">
    <header class="tb-stage__header">
      <div><h3>{{ title }}</h3><p>{{ description }}</p></div>
      <span class="tb-stage__count">{{ rounds.length }} {{ rounds.length === 1 ? 'этап' : rounds.length < 5 ? 'этапа' : 'этапов' }}</span>
    </header>
    <div v-if="rounds.length" class="tb-stage__mobile-nav">
      <button type="button" :disabled="activeRound === 0" aria-label="Предыдущий раунд" @click="activeRound--">←</button>
      <label>
        <span class="tb-sr-only">Раунд: {{ title }}</span>
        <select v-model="activeRound">
          <option v-for="(round, index) in rounds" :key="round.id" :value="index">{{ round.title }}</option>
        </select>
      </label>
      <button type="button" :disabled="activeRound === rounds.length - 1" aria-label="Следующий раунд" @click="activeRound++">→</button>
    </div>
    <p v-if="!rounds.length" class="tb-stage__empty">При двух командах проигравший верхнего финала сразу проходит в гранд-финал.</p>
    <div v-else class="tb-stage__viewport" tabindex="0" role="region" :aria-label="`${title}. На большом экране сетку можно прокручивать по горизонтали.`">
      <div class="tb-stage__canvas" :style="{ '--stage-width': `${width}px`, '--stage-height': `${height}px`, '--stage-rows': rows }">
        <svg class="tb-stage__lines" :width="width" :height="height" aria-hidden="true">
          <path v-for="path in paths" :key="path.id" :d="path.d" />
        </svg>
        <div v-for="(round, index) in rounds" :key="round.id" class="tb-stage__round" :class="{ 'tb-stage__round--active': activeRound === index }">
          <h4>{{ round.title }}</h4>
          <div class="tb-stage__matches">
            <div v-for="match in round.matches" :key="match.id" class="tb-stage__slot" :style="{ gridRow: `span ${rows / round.matches.length}` }">
              <BracketMatchCard :match="match" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tb-stage { min-width: 0; }
.tb-stage__header { display: flex; justify-content: space-between; align-items: start; gap: 16px; padding: 24px 0 20px; border-top: 1px solid var(--tb-border); }
.tb-stage__header h3 { margin: 0; padding-left: 12px; border-left: 3px solid var(--tb-accent); font-size: 18px; }
.tb-stage--lower .tb-stage__header h3 { border-left-color: var(--tb-blue); }
.tb-stage--finals .tb-stage__header h3 { border-left-color: var(--tb-success); }
.tb-stage__header p { margin: 8px 0 0; color: var(--tb-muted); font-size: 13px; line-height: 1.5; }
.tb-stage__count { flex-shrink: 0; padding: 5px 8px; color: var(--tb-muted); border: 1px solid var(--tb-border); border-radius: 0; font-size: 12px; }
.tb-stage__viewport { max-width: 100%; overflow-x: auto; overscroll-behavior-x: contain; padding-bottom: 16px; scrollbar-color: var(--tb-border) transparent; }
.tb-stage__canvas { position: relative; display: flex; gap: 40px; width: var(--stage-width); }
.tb-stage__round { flex: 0 0 260px; min-width: 0; position: relative; }
.tb-stage__round h4 { margin: 0; height: 40px; color: var(--tb-muted); font-size: 12px; font-weight: 500; }
.tb-stage__matches { display: grid; grid-template-rows: repeat(var(--stage-rows), 156px); }
.tb-stage__slot { display: flex; align-items: center; min-width: 0; }
.tb-stage__lines { position: absolute; top: 40px; left: 0; pointer-events: none; }
.tb-stage__lines path { fill: none; stroke: var(--tb-border); stroke-width: 1.5; }
.tb-stage__mobile-nav { display: none; }
.tb-stage__empty { color: var(--tb-muted); font-size: 14px; }
.tb-stage__viewport:focus-visible, button:focus-visible, select:focus-visible { outline: 2px solid var(--tb-accent); outline-offset: 3px; }
.tb-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 700px) {
  .tb-stage__header { padding-top: 20px; }
  .tb-stage__count { display: none; }
  .tb-stage__mobile-nav { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; gap: 8px; margin-bottom: 16px; }
  .tb-stage__mobile-nav label { min-width: 0; }
  .tb-stage__mobile-nav button, .tb-stage__mobile-nav select { width: 100%; min-height: 44px; border: 1px solid var(--tb-border); border-radius: 0; background: var(--tb-card); color: var(--tb-text); font-size: 16px; }
  .tb-stage__mobile-nav select { padding: 8px; }
  .tb-stage__mobile-nav button:disabled { opacity: .4; cursor: default; }
  .tb-stage__mobile-nav button:not(:disabled):hover { border-color: var(--tb-accent); }
  .tb-stage__viewport { overflow: visible; }
  .tb-stage__canvas { width: 100%; display: block; }
  .tb-stage__round { display: none; }
  .tb-stage__round--active { display: block; }
  .tb-stage__round h4, .tb-stage__lines { display: none; }
  .tb-stage__matches { display: flex; flex-direction: column; gap: 12px; }
}
</style>
