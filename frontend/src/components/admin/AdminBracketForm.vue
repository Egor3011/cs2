<script setup>
import { computed, ref, watch } from 'vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import { buildTournamentBracket } from '@/utils/tournamentBracket'
import { setBracketResult, syncLinkedMatches } from '@/utils/adminTournament'
const props = defineProps({ draft: { type: Object, required: true } })
const selected = ref('')
const status = ref('scheduled'), winner = ref(''), scores = ref([0, 0]), message = ref(''), error = ref('')
const state = computed(() => { try { return { bracket: buildTournamentBracket(props.draft) } } catch (error) { return { error: error.message } } })
const playable = computed(() => state.value.bracket?.matches.filter(match => match.slots.every(slot => slot.team)) ?? [])
const match = computed(() => playable.value.find(match => match.id === selected.value))
watch(playable, matches => { if (!matches.some(match => match.id === selected.value)) selected.value = matches.find(match => match.status !== 'completed')?.id ?? matches[0]?.id ?? '' }, { immediate: true })
watch(match, item => {
  const result = props.draft.results[item?.id]
  status.value = result?.status === 'live' ? 'live' : result ? 'completed' : 'scheduled'
  winner.value = result?.winnerId ?? ''; scores.value = [...(result?.scores ?? [0, 0])]
}, { immediate: true })
function applyResult() {
  error.value = ''; message.value = ''
  try {
    const result = status.value === 'scheduled' ? null : status.value === 'live' ? { status: 'live', scores: [...scores.value] } : { winnerId: winner.value, scores: [...scores.value] }
    const before = Object.keys(props.draft.results).filter(id => id !== selected.value)
    setBracketResult(props.draft, selected.value, result)
    const removed = before.filter(id => !props.draft.results[id])
    message.value = `Результат применён к черновику.${removed.length ? ` Сброшены зависимые результаты: ${removed.join(', ')}.` : ''} Нажмите «Сохранить», чтобы обновить сайт.`
  } catch (reason) { error.value = reason.message }
}
function resetResults() {
  if (window.confirm('Сбросить все результаты сетки? Команды и посев сохранятся. Изменения опубликуются после сохранения.')) { props.draft.results = {}; syncLinkedMatches(props.draft); message.value = 'Результаты сброшены в черновике.' }
}
function toggleReset(event) {
  const old = props.draft.resetFinal
  props.draft.resetFinal = event.target.checked
  try { buildTournamentBracket(props.draft) } catch (reason) { props.draft.resetFinal = old; error.value = 'Сначала сбросьте результаты повторного финала.' }
}
</script>
<template>
  <section aria-labelledby="admin-bracket-title">
    <h2 id="admin-bracket-title">Управление сеткой</h2>
    <p class="admin-hint">Сетка строится по посеву команд. Выберите матч, укажите счёт и победителя — следующие пары определятся автоматически. Исправление раннего результата сбрасывает несовместимые результаты следующих раундов.</p>
    <label class="admin-check"><input :checked="draft.resetFinal" @change="toggleReset" type="checkbox">Повторный гранд-финал при победе команды нижней сетки</label>
    <p v-if="state.error" class="inline-message" role="alert">{{ state.error }}</p>
    <template v-else>
      <div class="admin-edit-card">
        <label>Матч сетки<select v-model="selected" aria-label="Матч сетки"><option v-for="item in playable" :key="item.id" :value="item.id">{{ item.id }} · {{ item.slots.map(slot => slot.team.name).join(' — ') }}</option></select></label>
        <p v-if="!playable.length" class="admin-hint">Добавьте минимум две команды. Матчи следующих раундов откроются после определения участников.</p>
        <template v-if="match">
          <div class="admin-fields"><label>Состояние матча<select v-model="status" aria-label="Состояние матча"><option value="scheduled">Ожидает начала / сбросить результат</option><option value="live">В эфире</option><option value="completed">Завершён</option></select></label><label v-if="status === 'completed'">Победитель<select v-model="winner" aria-label="Победитель" required><option disabled value="">Выберите победителя</option><option v-for="slot in match.slots" :key="slot.team.id" :value="slot.team.id">{{ slot.team.name }}</option></select></label></div>
          <div v-if="status !== 'scheduled'" class="admin-fields"><label v-for="(slot, index) in match.slots" :key="slot.team.id">Счёт: {{ slot.team.name }}<input v-model.number="scores[index]" type="number" min="0" step="1" required></label></div>
          <button type="button" class="admin-secondary" @click="applyResult">Применить результат</button>
        </template>
      </div>
      <p v-if="error" class="inline-message" role="alert">{{ error }}</p><p v-if="message" class="admin-notice" role="status">{{ message }}</p>
      <button type="button" class="text-button accent" :disabled="!Object.keys(draft.results).length" @click="resetResults">Сбросить все результаты</button>
      <TournamentBracket :data="draft" />
    </template>
  </section>
</template>
