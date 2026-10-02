<script setup>
import { computed, ref } from 'vue'
import { buildTournamentBracket } from '@/utils/tournamentBracket'
import BracketStage from './BracketStage.vue'
const props = defineProps({ data: { type: [Object, String], required: true } })
const selected = ref('all')
const state = computed(() => {
  try { return { bracket: buildTournamentBracket(props.data), error: null } }
  catch (error) { return { bracket: null, error: error.message } }
})
const groups = [
  { id: 'upper', title: 'Верхняя сетка', description: 'Победитель проходит дальше. Проигравший получает второй шанс в нижней сетке.' },
  { id: 'lower', title: 'Нижняя сетка', description: 'Второе поражение означает выбывание из турнира.' },
  { id: 'finals', title: 'Финал', description: 'Встреча победителей верхней и нижней сеток.' },
]
const filters = [{ id: 'all', title: 'Вся сетка' }, ...groups]
</script>

<template>
  <section class="tournament-bracket" aria-label="Турнирная сетка">
    <div v-if="state.error" class="tb-message tb-message--error" role="alert">
      <strong>Не удалось построить сетку</strong><p>{{ state.error }}</p>
    </div>
    <template v-else>
      <header class="tb-header">
        <div>
          <span class="tb-eyebrow">ПУТЬ К ПОБЕДЕ</span>
          <h2>Сетка турнира</h2>
          <p>{{ state.bracket.title }} <span aria-hidden="true">·</span> Double elimination</p>
        </div>
        <div class="tb-summary">
          <span><strong>{{ state.bracket.teams.length }}</strong> команд</span>
          <span><strong>{{ state.bracket.completedCount }}</strong> сыграно</span>
        </div>
      </header>
      <div v-if="state.bracket.teams.length === 0" class="tb-message">Команды пока не добавлены. Сетка появится после добавления участников.</div>
      <template v-else>
        <div v-if="state.bracket.champion" class="tb-champion" role="status">
          <span>Победитель турнира</span><strong>{{ state.bracket.champion.name }}</strong>
        </div>
        <template v-if="state.bracket.teams.length > 1">
          <div class="tb-toolbar">
            <div class="tb-filters" role="group" aria-label="Показать часть сетки">
              <button v-for="filter in filters" :key="filter.id" type="button" :aria-pressed="selected === filter.id"
                @click="selected = filter.id">{{ filter.title }}</button>
            </div>
            <span class="tb-format">{{ state.bracket.resetFinal ? 'ДО ДВУХ ПОРАЖЕНИЙ' : 'БЕЗ ПОВТОРНОГО ФИНАЛА' }}</span>
          </div>
          <p v-if="state.bracket.byeCount" class="tb-note">
            <strong>Автопроход: {{ state.bracket.byeCount }}.</strong>
            Команды с лучшим посевом проходят первый раунд без игры. Пустые места не считаются поражением.
          </p>
          <p class="tb-mobile-hint">Выбирайте раунд стрелками или в списке.</p>
          <template v-for="group in groups" :key="group.id">
            <BracketStage v-show="selected === 'all' || selected === group.id" :rounds="state.bracket.rounds[group.id]"
              :title="group.title" :description="group.description" :kind="group.id" />
          </template>
          <p class="tb-note tb-note--last">
            {{ state.bracket.resetFinal
              ? 'Если команда нижней сетки выигрывает гранд-финал, проводится повторный финал: у обеих команд будет по одному поражению.'
              : 'По правилам этого турнира гранд-финал проводится без повторного матча.' }}
          </p>
        </template>
      </template>
    </template>
  </section>
</template>

<style scoped>
.tournament-bracket { --tb-text: #000; --tb-muted: #777; --tb-card: #fff; --tb-border: #000; --tb-accent: #000; --tb-blue: #000; --tb-success: #000; --tb-winner-bg: #eee; min-width: 0; max-width: 100%; margin-top: 40px; color: var(--tb-text); background: #fff; font-family: var(--font-family); line-height: 1.4; }
.tb-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px; }
.tb-eyebrow { display: none; }
.tb-header h2 { margin-bottom: 18px; }
.tb-header p { margin: 0; font-size: 18px; overflow-wrap: anywhere; }
.tb-summary { display: flex; gap: 30px; color: #777; font-size: 16px; }
.tb-summary strong { display: block; color: #000; font: 600 24px var(--font-display); }
.tb-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin: 30px 0 22px; }
.tb-filters { display: flex; flex-wrap: wrap; border: 2px solid #000; }
.tb-filters button { padding: 6px 12px; color: #000; background: #fff; border: 0; font-size: 16px; }
.tb-filters button:hover { background: #eee; }
.tb-filters button[aria-pressed='true'] { color: #fff; background: #000; }
.tb-format { color: #777; font-size: 12px; }
.tb-note { color: #000; padding: 15px; border: 1px solid #000; font-size: 16px; line-height: 1.4; margin: 0 0 24px; }
.tb-note--last { margin: 16px 0 0; }
.tb-message { padding: 24px 0; font-size: 18px; overflow-wrap: anywhere; }
.tb-message p { margin-bottom: 0; }
.tb-champion { margin-top: 24px; padding: 20px; border: 2px solid #000; overflow-wrap: anywhere; }
.tb-champion span { display: block; font-size: 18px; margin-bottom: 8px; }
.tb-champion strong { font: 600 24px var(--font-display); }
.tb-mobile-hint { display: none; }
@media (max-width: 700px) {
  .tb-header { gap: 20px; }
  .tb-header p { font-size: 16px; }
  .tb-summary { gap: 32px; }
  .tb-filters { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
  .tb-filters button { padding: 12px 8px; font-size: 16px; }
  .tb-format { display: none; }
  .tb-mobile-hint { display: block; color: #777; font-size: 14px; margin: 0 0 20px; }
}
</style>
