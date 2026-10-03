<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import TournamentBracket from '@/components/TournamentBracket.vue'
import LiveStream from '@/components/LiveStream.vue'
import RegistrationCountdown from '@/components/RegistrationCountdown.vue'
import TournamentFunding from '@/components/TournamentFunding.vue'
import defaultTerms from '@/data/tournamentTerms.json'
import { siteContent } from '@/data/siteContent'
import { formatRubles, registrationCountdown } from '@/utils/tournamentTerms'
import { twitchChannelFromUrl } from '@/utils/stream'

const route = useRoute()
const tournament = ref(null)
const isLoading = ref(true)
const loadError = ref('')
const activeTab = ref('participation')
const terms = computed(() => ({ ...defaultTerms, ...(tournament.value?.terms ?? {}) }))
const content = computed(() => siteContent(tournament.value?.content))
const registrationDeadlineText = computed(() => `${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(new Date(terms.value.registrationClosesAt)).replace(' в ', ', ')} МСК`)
const tournamentYear = computed(() => terms.value.startsOn.slice(0, 4))
const prizeShare = computed(() => 100 - terms.value.prizeDistribution.organization)
const registrationClosed = ref(registrationCountdown(defaultTerms.registrationClosesAt).closed)
const tournamentDates = computed(() => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' }).formatRange(new Date(terms.value.startsOn), new Date(terms.value.endsOn)))
const eventTab = ref('matches')
const registrationForm = ref({ teamName: '', captainName: '', email: '', contact: '', players: 5 })
const registrationStatus = ref('idle')
const registrationError = ref('')
const applications = ref([])
const applicationsStatus = ref('loading')
const applicationsError = ref('')
const applicationStatuses = { pending: 'На проверке', yes: 'Участвуют', waitpay: 'Ожидания взноса', approved: 'Допущена', rejected: 'Отклонена' }
const tabs = [ { id: 'participation', label: 'Условия' }, { id: 'form', label: 'Заявка' }, { id: 'teams', label: 'Команды' } ]
const eventTabs = [ { id: 'matches', label: 'Матчи' }, { id: 'bracket', label: 'Сетка' }, { id: 'stream', label: 'Трансляция' } ]
const stream = computed(() => tournament.value?.stream)
const streamChannel = computed(() => twitchChannelFromUrl(stream.value?.url))
const matches = computed(() => Object.entries(tournament.value?.matches ?? {}).filter(([, match]) => !match.hidden).map(([id, match]) => ({ id, ...match })))
const liveMatch = computed(() => matches.value.find(match => match.status === 'live'))
const matchStatuses = { live: 'В эфире', completed: 'Завершён', scheduled: 'Скоро' }
const participationSteps = computed(() => content.value.participationSteps)
const teamName = (id) => tournament.value?.teams?.find(team => team.id === id)?.name ?? 'Участник определится'
const faqItems = computed(() => {
  const distribution = terms.value.prizeDistribution
  return [
    ...content.value.faqItems.slice(0, 1),
    { question: 'Когда проходит турнир и закрывается регистрация?', answer: [`Турнир — ${tournamentDates.value} ${tournamentYear.value} года. Регистрация до ${registrationDeadlineText.value}.`, 'Расписание каждого матча капитан получит после подтверждения состава. Всё время на сайте — по Москве.'] },
    { question: 'Какой вступительный взнос и как делятся призовые?', answer: [`Вступительный взнос — ${formatRubles(terms.value.entryFee)} с команды. Призовой фонд формируется из взносов участников.`, `От общей суммы взносов: 1 место — ${distribution.first}%, 2 место — ${distribution.second}%, 3 место — ${distribution.third}%. Оставшиеся ${distribution.organization}% получает организатор за проведение мероприятия.`] },
    { question: 'Сколько команд нужно для проведения турнира?', answer: [`Минимум ${terms.value.minimumTeams} команд. Верхнего лимита количества команд нет.`] },
    { question: 'Где смотреть решающие матчи?', answer: [content.value.broadcastText, 'Откройте вкладку «Трансляция» в разделе «Матчи и сетка».'] },
    ...content.value.faqItems.slice(1),
  ]
})

async function loadTournament() {
  isLoading.value = true
  loadError.value = ''
  try { tournament.value = (await axios.get('/api/tournament')).data }
  catch { loadError.value = 'Не удалось загрузить турнир. Попробуйте ещё раз.' }
  finally { isLoading.value = false }
}
async function loadApplications() {
  applicationsStatus.value = 'loading'
  applicationsError.value = ''
  try {
    const { data } = await axios.get('/api/registrations')
    applications.value = Array.isArray(data) ? data : []
    applicationsStatus.value = 'success'
  } catch {
    applicationsError.value = 'Не удалось загрузить список команд.'
    applicationsStatus.value = 'error'
  }
}
async function submitRegistration() {
  if (registrationStatus.value === 'loading') return
  if (registrationCountdown(terms.value.registrationClosesAt).closed) {
    registrationClosed.value = true
    registrationError.value = 'Регистрация завершена. Новые заявки не принимаются.'
    return
  }
  registrationStatus.value = 'loading'
  registrationError.value = ''
  try {
    await axios.post('/api/registrations', registrationForm.value)
    registrationStatus.value = 'success'
    await loadApplications()
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) registrationClosed.value = true
    const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
    registrationError.value = typeof detail === 'string' ? detail : 'Не удалось отправить заявку. Проверьте данные и попробуйте ещё раз.'
    registrationStatus.value = 'error'
  }
}
function resetRegistration() {
  registrationForm.value = { teamName: '', captainName: '', email: '', contact: '', players: 5 }
  registrationStatus.value = 'idle'
  registrationError.value = ''
}
function formatDate(value) {
  if (!value) return 'Расписание уточняется'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Расписание уточняется' : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(date)
}
async function selectTab(id) {
  activeTab.value = id
  await nextTick()
  if (id === 'form') document.querySelector('[name=teamName]')?.focus({ preventScroll: true })
}
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
async function openRegistration() {
  await selectTab('form')
  scrollToSection('registration')
}
async function openEvent(tab) {
  eventTab.value = tab
  await nextTick()
  scrollToSection('tournament')
}
watch(() => route.hash, hash => { if (hash === '#registration') selectTab('form') }, { immediate: true })
onMounted(() => {
  loadTournament()
  loadApplications()
})
</script>

<template>
  <div class="site-page">
    <SiteHeader :registration-closed="registrationClosed" @register="openRegistration" />
    <main id="main-content" class="site-width" tabindex="-1">
      <section class="about-section hero-section" aria-labelledby="about-title">
        <span class="section-kicker">ОТКРЫТЫЙ ОНЛАЙН-ТУРНИР / COUNTER-STRIKE 2</span>
        <h1 id="about-title">{{ tournament?.title ?? 'CS2 Command Cup' }}<span class="accent" aria-hidden="true">.</span></h1>
        <p class="hero-lead" style="white-space: pre-line">{{ content.heroLead }}</p>
        <p class="hero-description">Играем <strong>{{ tournamentDates }} {{ tournamentYear }} года</strong>. {{ content.heroDescription }}</p>
        <div class="hero-actions">
          <button class="pill-button" type="button" :disabled="registrationClosed" @click="openRegistration">{{ registrationClosed ? 'Регистрация закрыта' : 'Подать заявку' }} <span v-if="!registrationClosed" class="accent" aria-hidden="true">↗</span></button>
          <button class="text-button" type="button" @click="openEvent('matches')">Расписание матчей <span aria-hidden="true">↓</span></button>
        </div>
        <dl class="hero-facts">
          <div><dt>Даты турнира</dt><dd>{{ tournamentDates }}</dd></div>
          <div><dt>Вступительный взнос</dt><dd class="accent">{{ formatRubles(terms.entryFee) }} <small>с команды</small></dd></div>
          <div><dt>Участники</dt><dd>От {{ terms.minimumTeams }} команд <small>без верхнего лимита</small></dd></div>
          <div><dt>Призовые</dt><dd>{{ prizeShare }}% взносов <small>на три места</small></dd></div>
        </dl>
        <RegistrationCountdown :deadline="terms.registrationClosesAt" @closed="registrationClosed = $event" />
        <div v-if="liveMatch" class="live-notice" role="region" aria-label="Матч в эфире">
          <span class="live-label"><i aria-hidden="true"></i>В эфире</span>
          <span class="live-notice__teams">{{ teamName(liveMatch.team1Id) }} <strong>{{ liveMatch.scores?.join(' : ') ?? 'vs' }}</strong> {{ teamName(liveMatch.team2Id) }}</span>
          <button v-if="streamChannel" class="text-button" type="button" @click="openEvent('stream')">Смотреть эфир <span aria-hidden="true">→</span></button>
          <RouterLink v-else :to="`/matches/${liveMatch.id}`">Открыть матч →</RouterLink>
        </div>
      </section>

      <section v-reveal id="registration" class="participation-section" aria-labelledby="participation-title">
        <div class="section-heading"><div><span class="section-kicker">01 / ДЛЯ КОМАНД</span><h2 id="participation-title">Как принять участие</h2></div><span class="section-aside">Заявку заполняет капитан</span></div>
        <div class="segmented" role="group" aria-label="Участие в турнире">
          <button v-for="tab in tabs" :key="tab.id" type="button" :aria-pressed="activeTab === tab.id" @click="selectTab(tab.id)">{{ tab.label }}</button>
        </div>
        <div :key="activeTab" class="tab-panel">
        <div v-if="activeTab === 'participation'" class="participation-content">
          <ol class="participation-steps">
            <li v-for="(step, index) in participationSteps" :key="step.title" v-reveal="index * 45"><span class="step-number">{{ String(index + 1).padStart(2, '0') }}</span><h3>{{ step.title }}</h3><p>{{ step.text }}</p></li>
          </ol>
          <div class="participation-cards">
            <article v-for="card in content.participationCards" :key="card.title" class="participation-card"><h3>{{ card.title }}</h3><p>{{ card.text }}</p></article>
          </div>
          <div class="participation-action"><button class="pill-button" type="button" :disabled="registrationClosed" @click="openRegistration">{{ registrationClosed ? 'Регистрация закрыта' : 'Подать заявку' }} <span v-if="!registrationClosed" class="accent" aria-hidden="true">↗</span></button><span>Взнос — {{ formatRubles(terms.entryFee) }} с команды</span></div>
        </div>

        <div v-else-if="activeTab === 'form'" class="registration-panel">
          <template v-if="registrationStatus !== 'success'">
            <h3>ЗАЯВКА КОМАНДЫ</h3>
            <p>Все поля обязательны. Контакты увидит организатор; в списке команд появятся только название, состав и статус.</p>
            <p class="registration-terms">Взнос — <strong>{{ formatRubles(terms.entryFee) }} с команды</strong>. Регистрация до <strong>{{ registrationDeadlineText }}</strong>.</p>
            <div v-if="registrationClosed" class="inline-message" role="status"><strong>Регистрация завершена</strong><p>Срок подачи заявок истёк. Новые заявки не принимаются.</p></div>
            <form v-else :aria-busy="registrationStatus === 'loading'" @submit.prevent="submitRegistration">
              <div class="form-grid">
                <label>Название команды *<input v-model.trim="registrationForm.teamName" type="text" name="teamName" minlength="2" maxlength="80" autocomplete="organization" placeholder="Название команды" required></label>
                <label>Имя капитана *<input v-model.trim="registrationForm.captainName" type="text" name="captainName" minlength="2" maxlength="80" autocomplete="name" placeholder="Имя или ник" required></label>
                <label>Email *<input v-model.trim="registrationForm.email" type="email" name="email" maxlength="254" autocomplete="email" placeholder="captain@example.com" required></label>
                <label>Telegram *<input v-model.trim="registrationForm.contact" type="text" name="contact" minlength="2" maxlength="100" autocomplete="off" placeholder="@captain" required><small>Укажите контакт, по которому организатор сможет вам написать.</small></label>
                <label>Игроков в заявке *<select v-model.number="registrationForm.players" name="players" required><option :value="5">5 игроков</option><option :value="6">6 игроков</option><option :value="7">7 игроков</option></select></label>
              </div>
              <label class="form-agreement"><input type="checkbox" name="agreement" required><span>Я принимаю <a href="/documents/tournament-regulations.txt" target="_blank" rel="noopener">регламент</a> и согласен на <a href="/documents/reglament_obrabotki_personalnyh_dannyh.pdf" target="_blank" rel="noopener">обработку данных</a>.</span></label>
              <p v-if="registrationError" role="alert" class="inline-message">{{ registrationError }}</p>
              <button class="pill-button" type="submit" :disabled="registrationStatus === 'loading'">{{ registrationStatus === 'loading' ? 'Отправляем…' : 'Отправить заявку' }}</button>
            </form>
          </template>
          <div v-else class="registration-success" role="status">
            <span class="section-kicker accent">ГОТОВО / СЛЕДУЮЩИЙ ШАГ — ПРОВЕРКА</span>
            <h3>ЗАЯВКА ПРИНЯТА</h3><p>Заявка получена. Следите за сообщениями в указанном Discord или Telegram — организатор свяжется с капитаном для подтверждения состава. </p> <p>Для ускорения процесса момете самостоятельно написать администратору - ТГ: @zavoz_contenta </p>
            <button class="pill-button" type="button" @click="selectTab('teams')">Список команд</button>
            <button class="text-button" type="button" @click="resetRegistration">Отправить ещё одну заявку</button>
          </div>
        </div>
        <div v-else class="teams-panel">
          <h3>КОМАНДЫ, ПОДАВШИЕ ЗАЯВКУ <span class="muted">/ {{ applications.length }}</span></h3>
          <p v-if="applicationsStatus === 'loading'" role="status">Загружаем список команд…</p>
          <div v-else-if="applicationsStatus === 'error'" class="inline-message" role="alert"><p>{{ applicationsError }}</p><button class="text-button" type="button" @click="loadApplications">Повторить</button></div>
          <div v-else-if="!applications.length"><p>Пока ни одной команды. Первая заявка появится здесь сразу после отправки.</p><button class="pill-button" type="button" @click="selectTab('form')">Подать заявку</button></div>
          <div v-else class="teams-list">
            <article v-for="team in applications" :key="team.id" class="teams-list__row">
              <strong>{{ team.teamName }}</strong><span>{{ team.players }} игроков</span><time :datetime="team.createdAt">{{ formatDate(team.createdAt) }}</time><span class="team-status" :class="{ 'accent': team.status === 'rejected' }">{{ applicationStatuses[team.status] ?? team.status }}</span>
            </article>
          </div>
        </div>
        </div>
      </section>

      <TournamentFunding :terms="terms" />

      <aside v-reveal class="preflight-note" aria-label="Важно перед матчем"><span class="section-kicker accent">ВАЖНО ПЕРЕД СТАРТОМ</span><p>{{ content.preflightText }}</p><a href="/documents/tournament-regulations.txt" target="_blank" rel="noopener">Прочитать регламент <span aria-hidden="true">↗</span></a></aside>

      <section v-reveal id="tournament" class="event-section" aria-labelledby="event-title">
        <div class="section-heading"><div><span class="section-kicker">03 / ДЛЯ ИГРОКОВ И ЗРИТЕЛЕЙ</span><h2 id="event-title">Матчи и сетка</h2></div><span class="section-aside">Всё время — по Москве</span></div>
        <div class="broadcast-note"><span class="section-kicker accent">РЕШАЮЩИЕ МАТЧИ — В ПРЯМОМ ЭФИРЕ</span><p>{{ content.broadcastText }}</p><button class="text-button" type="button" @click="openEvent('stream')">К трансляции <span aria-hidden="true">→</span></button></div>
        <div class="segmented" role="group" aria-label="Разделы турнира"><button v-for="tab in eventTabs" :key="tab.id" type="button" :aria-pressed="eventTab === tab.id" @click="eventTab = tab.id">{{ tab.label }}</button></div>
        <p v-if="isLoading" class="event-state" role="status">Загружаем данные турнира…</p>
        <div v-else-if="loadError" class="inline-message" role="alert"><p>{{ loadError }}</p><button class="text-button" type="button" @click="loadTournament">Повторить</button></div>
        <div v-else-if="tournament" :key="eventTab" class="tab-panel">
          <div v-if="eventTab === 'matches'" class="event-content">
            <p class="muted event-note">Выберите матч, чтобы увидеть счёт, карты и статистику игроков.</p>
            <p v-if="!matches.length">Расписание появится после подтверждения команд.</p>
            <div v-else class="schedule-list">
              <RouterLink v-for="match in matches" :key="match.id" :to="`/matches/${match.id}`" class="schedule-match">
                <div class="schedule-match__top"><span class="schedule-match__meta">{{ match.stage }} / BO{{ match.bestOf }}</span><span :class="match.status === 'live' ? 'live-label' : 'match-status'"><i v-if="match.status === 'live'" aria-hidden="true"></i>{{ matchStatuses[match.status] ?? match.status }}</span></div>
                <h3>{{ teamName(match.team1Id) }} <span>{{ match.scores?.join(' : ') ?? 'vs' }}</span> {{ teamName(match.team2Id) }}</h3>
                <time :datetime="match.startsAt">{{ formatDate(match.startsAt) }}</time>
                <span class="schedule-match__link">Открыть матч →</span>
              </RouterLink>
            </div>
          </div>
          <TournamentBracket v-else-if="eventTab === 'bracket'" :data="tournament" />
          <div v-else class="event-content"><LiveStream v-if="streamChannel" :channel="streamChannel" :team1="stream?.team1" :team2="stream?.team2" :score1="stream?.score1" :score2="stream?.score2" :format="stream?.format" :live="Boolean(liveMatch)" /><p v-else>Трансляция появится перед началом матча.</p></div>
        </div>
      </section>

      <section v-reveal id="faq" class="faq-section" aria-labelledby="faq-title">
        <span class="section-kicker">04 / ЕСЛИ ОСТАЛИСЬ ВОПРОСЫ</span><h2 id="faq-title">Частые вопросы</h2>
        <div class="faq-list">
          <details v-for="(item, index) in faqItems" :key="item.question" :open="index === 0" name="tournament-faq">
            <summary><span aria-hidden="true">&gt;</span> {{ item.question }}</summary>
            <div class="faq-answer"><p v-for="paragraph in item.answer" :key="paragraph">{{ paragraph }}</p></div>
          </details>
        </div>
      </section>
    </main>
    <SiteFooter :stream-url="streamChannel ? stream.url : ''" :organizer-url="content.organizerUrl" :organizer-label="content.organizerLabel" @register="openRegistration" />
  </div>
</template>
