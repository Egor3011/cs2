<script setup>
import { computed, ref, watch } from 'vue'
import { buildTournamentBracket } from '@/utils/tournamentBracket'
import { clone, moscowInput, moscowIso, syncLinkedMatches } from '@/utils/adminTournament'
const props = defineProps({ draft: { type: Object, required: true } })
const selected = ref(Object.keys(props.draft.matches)[0] ?? '')
const match = computed(() => props.draft.matches[selected.value])
const error = ref('')
const bracketMatches = computed(() => { try { return buildTournamentBracket(props.draft).matches.filter(item => item.slots.every(slot => slot.team)) } catch { return [] } })
watch(() => Object.keys(props.draft.matches), ids => { if (!ids.includes(selected.value)) selected.value = ids[0] ?? '' })
function addMatch(copy = false) {
  if (props.draft.teams.length < 2) { error.value = 'Для матча нужны две команды.'; return }
  const id = `match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const data = copy ? clone(match.value) : { stage: 'Новый матч', status: 'scheduled', startsAt: null, team1Id: props.draft.teams[0].id, team2Id: props.draft.teams[1].id, bestOf: 3, maps: [], players: [], broadcast: { url: props.draft.stream.url || '' } }
  if (copy) { data.stage += ' (копия)'; delete data.bracketId; data.hidden = false }
  props.draft.matches[id] = data; selected.value = id; error.value = ''
}
function removeMatch() {
  if (window.confirm(`Удалить матч «${match.value.stage}»? Изменение вступит в силу после сохранения.`)) delete props.draft.matches[selected.value]
}
function linkBracket(id) {
  if (!id) { delete match.value.bracketId; match.value.hidden = false; return }
  match.value.bracketId = id
  syncLinkedMatches(props.draft)
}
function changeMapStatus(map) { if (map.status === 'scheduled') delete map.scores; else map.scores ??= [0, 0] }
const teamName = id => props.draft.teams.find(team => team.id === id)?.name ?? 'Команда'
</script>
<template>
  <section aria-labelledby="admin-matches-title">
    <div class="admin-card-heading"><h2 id="admin-matches-title">Матчи</h2><button type="button" class="admin-secondary" @click="addMatch()">+ Добавить матч</button></div>
    <p class="admin-hint">Матчи отображаются в расписании и имеют отдельные страницы со счётом, картами и статистикой.</p>
    <p v-if="error" class="inline-message" role="alert">{{ error }}</p>
    <label v-if="Object.keys(draft.matches).length">Выберите матч<select v-model="selected" aria-label="Выберите матч"><option v-for="(item, id) in draft.matches" :key="id" :value="id">{{ item.stage }} · {{ teamName(item.team1Id) }} — {{ teamName(item.team2Id) }}</option></select></label>
    <p v-else class="admin-empty">Матчей пока нет. Добавьте первый матч.</p>
    <div v-if="match" class="admin-match-editor" :key="selected">
      <div class="admin-card-heading"><RouterLink :to="`/matches/${selected}`" target="_blank">Открыть страницу матча ↗</RouterLink><div class="admin-row-actions"><button type="button" class="text-button" @click="addMatch(true)">Дублировать</button><button type="button" class="text-button accent" @click="removeMatch">Удалить матч</button></div></div>
      <p v-if="match.hidden" class="admin-notice">Матч скрыт с сайта: участники в сетке ещё не определились. Он появится снова, когда обе команды станут известны.</p>
      <label v-if="!match.bracketId" class="admin-check"><input type="checkbox" :checked="!match.hidden" @change="match.hidden = !$event.target.checked">Показывать матч на сайте</label>
      <div class="admin-fields">
        <label>Название / стадия<input v-model.trim="match.stage" required maxlength="150"></label>
        <label>Дата и время, МСК<input :value="moscowInput(match.startsAt)" @input="match.startsAt = moscowIso($event.target.value)" type="datetime-local"><small>Можно оставить пустым: «Расписание уточняется».</small></label>
        <label>Связать с сеткой<select aria-label="Связать с сеткой" :value="match.bracketId ?? ''" @change="linkBracket($event.target.value)"><option value="">Самостоятельный матч</option><option v-if="match.bracketId && !bracketMatches.some(item => item.id === match.bracketId)" :value="match.bracketId">{{ match.bracketId }} · Ждёт участников</option><option v-for="item in bracketMatches" :key="item.id" :value="item.id">{{ item.id }} · {{ item.slots.map(slot => slot.team.name).join(' — ') }}</option></select></label>
        <label>Формат<select v-model.number="match.bestOf" aria-label="Формат"><option v-for="value in [1, 3, 5, 7, 9]" :key="value" :value="value">BO{{ value }}</option></select></label>
        <label>Команда 1<select aria-label="Команда 1" v-model="match.team1Id" :disabled="Boolean(match.bracketId)"><option v-for="team in draft.teams" :key="team.id" :value="team.id">{{ team.name }}</option></select></label>
        <label>Команда 2<select aria-label="Команда 2" v-model="match.team2Id" :disabled="Boolean(match.bracketId)"><option v-for="team in draft.teams" :key="team.id" :value="team.id">{{ team.name }}</option></select></label>
        <label>Статус<select aria-label="Статус" v-model="match.status" :disabled="Boolean(match.bracketId)"><option value="scheduled">Ожидает начала</option><option value="live">В эфире</option><option value="completed">Завершён</option></select></label>
      </div>
      <p v-if="match.bracketId" class="admin-hint">Участники, статус и счёт связаны с сеткой. Меняйте результат в разделе «Сетка» — страница матча обновится вместе с ним.</p>
      <div v-if="match.scores" class="admin-fields"><label>Счёт команды 1<input v-model.number="match.scores[0]" type="number" min="0" step="1" :disabled="Boolean(match.bracketId)" required></label><label>Счёт команды 2<input v-model.number="match.scores[1]" type="number" min="0" step="1" :disabled="Boolean(match.bracketId)" required></label><button v-if="!match.bracketId" type="button" class="text-button" @click="delete match.scores">Убрать счёт</button></div>
      <button v-else-if="!match.bracketId" type="button" class="admin-secondary" @click="match.scores = [0, 0]">Добавить счёт</button>
      <h3>Трансляция матча</h3>
      <button v-if="!match.broadcast" type="button" class="admin-secondary" @click="match.broadcast = { url: draft.stream.url || '' }">Добавить трансляцию</button>
      <div v-else class="admin-fields"><label>Ссылка Twitch<input v-model.trim="match.broadcast.url" type="url"></label><label>Комментатор<input v-model.trim="match.broadcast.commentator"></label></div>
      <h3>Карты</h3>
      <article v-for="(map, index) in match.maps" :key="index" class="admin-edit-card"><div class="admin-card-heading"><strong>Карта {{ index + 1 }}</strong><button type="button" class="text-button accent" @click="match.maps.splice(index, 1)">Удалить карту</button></div><div class="admin-fields"><label>Название карты<input v-model.trim="map.name" list="cs2-maps" required></label><label>Статус карты<select aria-label="Статус карты" v-model="map.status" @change="changeMapStatus(map)"><option value="scheduled">Ожидает начала</option><option value="live">В эфире</option><option value="completed">Завершена</option></select></label><template v-if="map.scores"><label>Раунды команды 1<input v-model.number="map.scores[0]" type="number" min="0" step="1" required></label><label>Раунды команды 2<input v-model.number="map.scores[1]" type="number" min="0" step="1" required></label></template></div></article>
      <datalist id="cs2-maps"><option v-for="name in ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Dust II', 'Anubis', 'Vertigo']" :key="name" :value="name"></option></datalist>
      <button type="button" class="admin-secondary" :disabled="(match.maps?.length ?? 0) >= match.bestOf" @click="(match.maps ??= []).push({ name: '', status: 'scheduled' })">+ Добавить карту</button>
      <details class="admin-details"><summary>Статистика игроков ({{ match.players?.length ?? 0 }})</summary><p class="admin-hint">Необязательно. Эти данные отображаются на странице матча.</p>
        <article v-for="(player, index) in match.players" :key="index" class="admin-edit-card"><div class="admin-card-heading"><strong>{{ player.name || `Игрок ${index + 1}` }}</strong><button type="button" class="text-button accent" @click="match.players.splice(index, 1)">Удалить игрока</button></div><div class="admin-fields"><label>Ник игрока<input v-model.trim="player.name" required></label><label>Команда<select v-model="player.teamId"><option :value="match.team1Id">{{ teamName(match.team1Id) }}</option><option :value="match.team2Id">{{ teamName(match.team2Id) }}</option></select></label><label v-for="[key, title, max, step] in [['kills', 'Убийства', undefined, 1], ['deaths', 'Смерти', undefined, 1], ['adr', 'ADR', undefined, 0.1], ['kast', 'KAST, %', 100, 0.1], ['rating', 'Rating', undefined, 0.01]]" :key="key">{{ title }}<input v-model.number="player[key]" type="number" min="0" :max="max" :step="step" required></label></div></article>
        <button type="button" class="admin-secondary" @click="(match.players ??= []).push({ name: '', teamId: match.team1Id, kills: 0, deaths: 0, adr: 0, kast: 0, rating: 0 })">+ Добавить игрока</button>
      </details>
    </div>
  </section>
</template>
