<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import LiveStream from '@/components/LiveStream.vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import { twitchChannelFromUrl } from '@/utils/stream'
const route = useRoute()
const response = ref(null)
const isLoading = ref(true)
const loadError = ref('')
const selected = ref('score')
const match = computed(() => response.value?.match)
const tournament = computed(() => response.value?.tournament)
const channel = computed(() => twitchChannelFromUrl(match.value?.broadcast?.url))
const teamName = (id) => tournament.value?.teams?.find(team => team.id === id)?.name ?? 'Участник определится'
const statuses = { live: 'В эфире', completed: 'Завершён', scheduled: 'Ожидает начала' }
const tabs = [{ id: 'score', label: 'Матч' }, { id: 'stream', label: 'Трансляция' }, { id: 'bracket', label: 'Сетка' }]
const date = computed(() => {
  if (!match.value?.startsAt) return 'Расписание уточняется'
  const parsed = new Date(match.value?.startsAt)
  return Number.isNaN(parsed.getTime()) ? 'Расписание уточняется' : `${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(parsed)} МСК`
})
let requestId = 0
let refreshTimer
async function loadMatch(refresh = false) {
  const currentRequest = ++requestId
  if (!refresh) { isLoading.value = true; response.value = null }
  loadError.value = ''
  try {
    const { data } = await axios.get(`/api/matches/${encodeURIComponent(route.params.id)}`)
    if (currentRequest === requestId) response.value = data
  } catch (error) {
    if (currentRequest !== requestId) return
    loadError.value = error.response?.status === 404 ? 'Матч не найден.' : 'Не удалось загрузить данные матча. Попробуйте ещё раз.'
  } finally { if (currentRequest === requestId) isLoading.value = false }
}
watch(() => route.params.id, () => { selected.value = 'score'; loadMatch() }, { immediate: true })
refreshTimer = window.setInterval(() => { if (match.value?.status === 'live' && !document.hidden) loadMatch(true) }, 30000)
onUnmounted(() => { clearInterval(refreshTimer); requestId++ })
</script>

<template>
  <div class="site-page match-page">
    <SiteHeader />
    <main id="main-content" class="site-width match-content" tabindex="-1">
      <RouterLink class="match-back" to="/">← К турниру</RouterLink>
      <p v-if="isLoading" class="match-state" role="status">Загружаем матч…</p>
      <div v-if="loadError" class="inline-message" role="alert"><p>{{ loadError }}</p><button class="text-button" type="button" @click="loadMatch(Boolean(response))">Повторить</button></div>
      <template v-if="match">
        <span class="section-kicker">{{ tournament.title }} / BO{{ match.bestOf }}</span>
        <h1>{{ match.stage }}</h1>
        <div class="match-intro"><time :datetime="match.startsAt">{{ date }}</time><span :class="match.status === 'live' ? 'live-label' : 'match-status'"><i v-if="match.status === 'live'" aria-hidden="true"></i>{{ statuses[match.status] ?? match.status }}</span></div>
        <div class="segmented" role="group" aria-label="Разделы матча"><button v-for="tab in tabs" :key="tab.id" type="button" :aria-pressed="selected === tab.id" @click="selected = tab.id">{{ tab.label }}</button></div>
        <div v-if="selected === 'score'" class="match-data tab-panel" key="score">
          <div class="scoreboard" aria-label="Счёт матча"><strong>{{ teamName(match.team1Id) }}</strong><span>{{ match.scores?.join(' : ') ?? '— : —' }}</span><strong>{{ teamName(match.team2Id) }}</strong></div>
          <div class="match-maps"><article v-for="(map, index) in match.maps" :key="`${map.name}-${index}`" class="match-map" :class="{ 'match-map--live': map.status === 'live' }"><small>MAP {{ index + 1 }}{{ map.status === 'live' ? ' / LIVE' : '' }}</small><h3>{{ map.name }}</h3><strong>{{ map.scores?.join(' : ') ?? '—' }}</strong></article></div>
          <section v-reveal class="match-statistics" aria-labelledby="statistics-title"><h2 id="statistics-title">Статистика матча</h2>
            <p v-if="match.players?.length" class="statistics-hint">Листайте таблицу, чтобы увидеть все показатели <span aria-hidden="true">→</span></p>
            <p v-if="!match.players?.length">Статистика появится после начала матча.</p>
            <div v-else class="statistics-scroll" tabindex="0" role="region" aria-label="Статистика игроков, таблицу можно прокручивать"><table><thead><tr><th scope="col">Игрок</th><th scope="col">K-D</th><th scope="col">ADR</th><th scope="col">KAST</th><th scope="col">Rating</th></tr></thead><tbody><tr v-for="player in match.players" :key="`${player.teamId}-${player.name}`"><th scope="row">{{ player.name }}<small>{{ teamName(player.teamId) }}</small></th><td>{{ player.kills }}–{{ player.deaths }}</td><td>{{ player.adr }}</td><td>{{ player.kast }}%</td><td>{{ player.rating?.toFixed(2) ?? '—' }}</td></tr></tbody></table></div>
          </section>
          <section v-if="match.nextMatch" v-reveal class="next-match-section"><h2>Следующий матч</h2><p>{{ match.nextMatch.stage }}<br>{{ match.nextMatch.description }}</p><strong>{{ match.nextMatch.team1 }} / {{ match.nextMatch.team2 }}</strong></section>
        </div>
        <div v-else-if="selected === 'stream'" class="match-data tab-panel" key="stream"><LiveStream v-if="channel" :channel="channel" :team1="teamName(match.team1Id)" :team2="teamName(match.team2Id)" :score1="match.scores?.[0]" :score2="match.scores?.[1]" :format="`BO${match.bestOf}`" :live="match.status === 'live'" /><p v-else>Трансляция появится перед началом матча.</p><p v-if="match.broadcast?.commentator">Комментатор: {{ match.broadcast.commentator }}</p></div>
        <TournamentBracket v-else :data="tournament" />
      </template>
    </main>
    <SiteFooter :stream-url="channel ? match.broadcast.url : ''" />
  </div>
</template>
