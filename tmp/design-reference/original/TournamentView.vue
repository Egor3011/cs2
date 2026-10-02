<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import TournamentBracket from '@/components/TournamentBracket.vue'
import LiveStream from '@/components/LiveStream.vue'
import { twitchChannelFromUrl } from '@/utils/stream'

const ifDateGone = ref(null)

const tournament = ref(null)
const isLoading = ref(true)
const loadError = ref('')

const startDate = ref("2026-10-02")

function isPastDate(targetDate) {
  // Создаем объект даты для проверки
  const checkedDate = new Date(targetDate);
  
  // Получаем текущую дату и время
  const now = new Date();
  
  // Сравниваем их в миллисекундах
  return checkedDate.getTime() < now.getTime();
}

const registrationForm = ref({
  teamName: '',
  captainName: '',
  email: '',
  contact: '',
  players: 5,
})
const registrationStatus = ref('idle')
const registrationError = ref('')
const applications = ref([])
const applicationsStatus = ref('loading')
const applicationsError = ref('')

const applicationStatuses = {
  pending: { label: 'На проверке', description: 'Заявка получена' },
  approved: { label: 'Допущена', description: 'Состав подтверждён' },
  rejected: { label: 'Отклонена', description: 'Заявка не прошла проверку' },
}

async function loadTournament() {
  isLoading.value = true
  loadError.value = ''

  ifDateGone.value = isPastDate(startDate.value)
  console.log(ifDateGone.value)

  try {
    const { data } = await axios.get('/api/tournament')
    tournament.value = data
  } catch (error) {
    const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
    loadError.value = typeof detail === 'string'
      ? detail
      : 'Не удалось получить данные турнира. Проверьте, что backend запущен.'
  } finally {
    isLoading.value = false
  }
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

function formatApplicationDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date)
}

function teamInitials(teamName) {
  return teamName.split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase()
}

onMounted(() => {
  loadTournament()
  loadApplications()
})

async function submitRegistration() {
  registrationStatus.value = 'loading'
  registrationError.value = ''

  try {
    await axios.post('/api/registrations', registrationForm.value)
    registrationStatus.value = 'success'
    await loadApplications()
  } catch (error) {
    const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
    registrationError.value = typeof detail === 'string'
      ? detail
      : 'Не удалось отправить заявку. Проверьте поля и попробуйте снова.'
    registrationStatus.value = 'error'
  }
}

function resetRegistration() {
  registrationForm.value = { teamName: '', captainName: '', email: '', contact: '', players: 5 }
  registrationStatus.value = 'idle'
  registrationError.value = ''
}

const bracketTeams = computed(() => tournament.value?.teams?.length ?? 0)
const stream = computed(() => tournament.value?.stream ?? null)
const streamChannel = computed(() => twitchChannelFromUrl(stream.value?.url))
const tournamentDetails = [
  { label: 'Призовой фонд', value: 'от 10.000 рублей' },
  { label: 'Формат', value: 'Double elimination' },
  { label: 'Регион', value: 'RU' },
  { label: 'Платформа', value: 'Cubershok' },
]
const upcomingMatches = [
  { id: 'final', stage: 'ФИНАЛ ВЕРХНЕЙ СЕТКИ', date: 'Сегодня', time: '18:00', team1: 'Virtus.pro', team2: 'NAVI', logo1: 'V', logo2: 'N', map: 'BO3 · Mirage', featured: true },
  { id: 'lower-final', stage: 'ФИНАЛ НИЖНЕЙ СЕТКИ', date: 'Сегодня', time: '20:30', team1: 'Team Spirit', team2: 'Проигравший WB', logo1: 'S', logo2: 'W', map: 'BO3 · Ancient', featured: false },
  { id: 'grand-final', stage: 'ГРАНД-ФИНАЛ', date: 'Завтра', time: '19:00', team1: 'Победитель WB', team2: 'Победитель LB', logo1: 'W', logo2: 'L', map: 'BO5', featured: false },
]
const faqItems = [
  { question: 'Кто может участвовать в турнире?', answer: 'К участию допускаются команды из региона EU/CIS с основным составом из пяти игроков. Можно указать до двух запасных.' },
  { question: 'Есть ли регистрационный взнос?', answer: 'Нет, участие бесплатное. После отправки заявки организатор свяжется с капитаном для проверки состава.' },
  { question: 'Где будут проходить матчи?', answer: 'Все матчи проводятся онлайн на серверах Faceit. Данные лобби и расписание капитаны получат по указанному контакту.' },
  { question: 'Можно ли заменить игрока после регистрации?', answer: 'Да, до окончания проверки заявок. Капитану нужно связаться с администратором до публикации посева.' },
]
const documents = [
  { title: 'Регламент турнира', description: 'Формат, расписание, карты и штрафы.', href: '/documents/tournament-regulations.txt' },
  { title: 'Согласие участника', description: 'Условия участия и ответственность игроков.', href: '/documents/participant-agreement.txt' },
  { title: 'Обработка данных', description: 'Как мы используем контакты из заявки.', href: '/documents/reglament_obrabotki_personalnyh_dannyh.pdf' },
]
</script>

<template>
  <main class="tournament-page">
    <header class="tournament-nav">
      <div class="tournament-page__container tournament-nav__inner">
        <RouterLink to="/" class="tournament-logo" aria-label="CS2 Command — на главную">
          <span>CS2</span> COMMAND
        </RouterLink>
        <nav class="tournament-nav__links" aria-label="Основная навигация">
          <RouterLink to="/">Турниры</RouterLink>
          <RouterLink to="/matches/final">Матчи</RouterLink>
          <a href="#bracket">Сетка</a>
          <a href="#registration">Регистрация</a>
          <a href="#teams">Команды</a>
        </nav>
        <RouterLink to="/" class="tournament-nav__back">Все турниры <span aria-hidden="true">↗</span></RouterLink>
      </div>
    </header>

    <div class="tournament-page__container">
      <nav class="tournament-crumbs" aria-label="Хлебные крошки">
        <RouterLink to="/">Турниры</RouterLink><span aria-hidden="true">/</span><span>{{ tournament?.title ?? 'Загрузка…' }}</span>
      </nav>

      <section v-if="isLoading" class="tournament-api-state" aria-live="polite">
        <span class="tournament-api-state__loader" aria-hidden="true"></span>
        <div><strong>Загружаем турнир</strong><p>Получаем актуальную сетку с сервера.</p></div>
      </section>

      <section v-else-if="loadError" class="tournament-api-state tournament-api-state--error" role="alert">
        <div><strong>Ошибка загрузки</strong><p>{{ loadError }}</p></div>
        <button type="button" @click="loadTournament">Повторить</button>
      </section>

      <template v-else-if="tournament">
      <section class="tournament-hero" aria-labelledby="tournament-title">
        <div class="tournament-poster" role="img" :aria-label="`Постер турнира ${tournament.title}`">
          <div class="tournament-poster__glow"></div>
          <span class="tournament-poster__edition">SEASON 01</span>
          <span class="tournament-poster__game">COUNTER-STRIKE 2</span>
          <strong>CS2<br><i>COMMAND</i><br>CUP</strong>
          <span class="tournament-poster__date">2-4<br>ОКТЯБРЯ</span>
          <span class="tournament-poster__grid" aria-hidden="true"></span>
        </div>

        <div class="tournament-hero__content">
          <div class="tournament-live"><span></span>ОТКРЫТА РЕГИСТРАЦИЯ</div>
          <h1 id="tournament-title">{{ tournament.title }}</h1>
          <p class="tournament-hero__description">Открытый онлайн-турнир для сильнейших составов. Две сетки, борьба до двух поражений и финал в формате BO5.</p>
          <div class="tournament-hero__meta">
            <div><span>Даты</span><strong>2-4 октября</strong></div>
            <div><span>Участники</span><strong>{{ bracketTeams }} команды</strong></div>
            <div><span>Статус</span><strong class="tournament-status">В плей-офф</strong></div>
          </div>
          <a href="#matches" class="tournament-hero__action">Ближайшие матчи <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <LiveStream
        v-if="streamChannel"
        :channel="streamChannel"
        :team1="stream?.team1 ?? 'Команда 1'"
        :team2="stream?.team2 ?? 'Команда 2'"
        :score1="stream?.score1"
        :score2="stream?.score2"
        :format="stream?.format ?? 'LIVE · BO3'"
      />

      <section class="tournament-overview" aria-labelledby="overview-title">
        <div class="tournament-section-heading">
          <span>О ТУРНИРЕ</span>
          <h2 id="overview-title">Основная информация</h2>
        </div>
        <div class="tournament-details">
          <article v-for="detail in tournamentDetails" :key="detail.label" class="tournament-detail">
            <span>{{ detail.label }}</span><strong>{{ detail.value }}</strong>
          </article>
        </div>
        <div class="tournament-rules">
          <div class="tournament-rules__number">02</div>
          <div><span>СИСТЕМА ПРОВЕДЕНИЯ</span><h3>До двух поражений</h3></div>
          <p>После первого проигрыша команда переходит в нижнюю сетку. Победитель нижней сетки встретится с победителем верхней в гранд-финале.</p>
        </div>
      </section>

      <section id="registration" class="tournament-registration" aria-labelledby="registration-title">
        <div class="tournament-registration__layout">
          <div class="tournament-registration__intro">
            <span class="tournament-registration__status"><i></i> ЗАЯВКИ ОТКРЫТЫ</span>
            <h2 id="registration-title">Заявите команду</h2>
            <p>Оставьте контакты капитана. После проверки заявки мы пришлём инструкцию и ссылку на чат участников.</p>
            <ol>
              <li><b>01</b><span><strong>Заполните форму</strong><small>Нужны только данные команды и капитана.</small></span></li>
              <li><b>02</b><span><strong>Пройдите проверку</strong><small>Администратор свяжется с вами по указанному контакту.</small></span></li>
              <li><b>03</b><span><strong>Подтвердите состав</strong><small>Добавьте Steam и Faceit профили в чате участников.</small></span></li>
            </ol>
          </div>

          <div class="tournament-registration__panel">
            <form v-if="registrationStatus !== 'success'" @submit.prevent="submitRegistration">
              <div class="tournament-form__heading"><span>КОМАНДА</span><b>5—7 игроков</b></div>
              <div class="tournament-form__grid">
                <label><span>Название команды *</span><input v-model.trim="registrationForm.teamName" type="text" name="teamName" minlength="2" maxlength="80" autocomplete="organization" placeholder="Team name" required></label>
                <label><span>Имя капитана *</span><input v-model.trim="registrationForm.captainName" type="text" name="captainName" minlength="2" maxlength="80" autocomplete="name" placeholder="Имя или ник" required></label>
                <label><span>Email *</span><input v-model.trim="registrationForm.email" type="email" name="email" maxlength="254" autocomplete="email" placeholder="captain@example.com" required></label>
                <label><span>Discord / Telegram *</span><input v-model.trim="registrationForm.contact" type="text" name="contact" minlength="2" maxlength="100" autocomplete="off" placeholder="@captain" required></label>
                <label class="tournament-form__players"><span>Игроков в заявке *</span><select v-model.number="registrationForm.players" name="players" required><option :value="5">5 игроков</option><option :value="6">6 игроков</option><option :value="7">7 игроков</option></select></label>
              </div>
              <label class="tournament-form__agreement"><input type="checkbox" required><span>Я принимаю <a href="/documents/tournament-regulations.txt" target="_blank" rel="noopener">регламент</a> и согласен на обработку данных.</span></label>
              <p v-if="registrationError" class="tournament-form__error" role="alert">{{ registrationError }}</p>
              <button type="submit" :disabled="registrationStatus === 'loading'">
                <span>{{ registrationStatus === 'loading' ? 'Отправляем…' : 'Отправить заявку' }}</span><i aria-hidden="true">→</i>
              </button>
              <small class="tournament-form__note">Ответим на указанный контакт в течение 24 часов.</small>
            </form>
            <div v-else class="tournament-registration__success" role="status" aria-live="polite">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
              <span>ЗАЯВКА ПРИНЯТА</span>
              <h3>Команда в списке</h3>
              <p>Мы свяжемся с капитаном после проверки данных.</p>
              <button type="button" @click="resetRegistration">Отправить ещё одну</button>
            </div>
          </div>
        </div>
      </section>

      <section id="teams" class="tournament-applications" aria-labelledby="applications-title">
        <div class="tournament-applications__header">
          <div class="tournament-section-heading">
            <span>УЧАСТНИКИ</span>
            <h2 id="applications-title">Команды, подавшие заявку</h2>
          </div>
          <div class="tournament-applications__counter" aria-live="polite">
            <strong>{{ applications.length }}</strong><span>заявок<br>получено</span>
          </div>
        </div>

        <div v-if="applicationsStatus === 'loading'" class="tournament-applications__loading" aria-label="Загружаем список команд" aria-live="polite">
          <span v-for="index in 3" :key="index"></span>
        </div>

        <div v-else-if="applicationsStatus === 'error'" class="tournament-applications__message" role="alert">
          <div><strong>Список временно недоступен</strong><p>{{ applicationsError }}</p></div>
          <button type="button" @click="loadApplications">Повторить</button>
        </div>

        <div v-else-if="applications.length === 0" class="tournament-applications__message tournament-applications__message--empty">
          <span class="tournament-applications__empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6"/></svg></span>
          <div><strong>Пока ни одной команды</strong><p>Первая заявка появится здесь сразу после отправки.</p></div>
          <a href="#registration">Подать заявку</a>
        </div>

        <div v-else class="tournament-applications__table" role="table" aria-label="Команды, подавшие заявку">
          <div class="tournament-applications__row tournament-applications__row--head" role="row">
            <span role="columnheader">Команда</span><span role="columnheader">Состав</span><span role="columnheader">Дата</span><span role="columnheader">Статус</span>
          </div>
          <div v-for="team in applications" :key="team.id" class="tournament-applications__row" role="row">
            <div class="tournament-applications__team" role="cell"><b>{{ teamInitials(team.teamName) }}</b><span><strong>{{ team.teamName }}</strong><small>ID {{ team.id.slice(0, 8).toUpperCase() }}</small></span></div>
            <div class="tournament-applications__cell" role="cell"><small>Состав</small><strong>{{ team.players }} {{ team.players === 5 ? 'игроков' : 'игроков' }}</strong></div>
            <div class="tournament-applications__cell" role="cell"><small>Дата</small><time :datetime="team.createdAt">{{ formatApplicationDate(team.createdAt) }}</time></div>
            <div class="tournament-applications__cell" role="cell"><small>Статус</small><span class="tournament-application-status" :class="`tournament-application-status--${team.status}`"><i aria-hidden="true"></i><span><strong>{{ applicationStatuses[team.status]?.label ?? team.status }}</strong><small>{{ applicationStatuses[team.status]?.description }}</small></span></span></div>
          </div>
        </div>
      </section>

      <section v-if="ifDateGone" id="bracket" class="tournament-bracket-section" aria-label="Сетка турнира">
        <TournamentBracket :data="tournament" />
      </section>

      <section v-if="ifDateGone" id="matches" class="tournament-matches" aria-labelledby="matches-title">
        <div class="tournament-matches__header">
          <div class="tournament-section-heading">
            <span>РАСПИСАНИЕ</span><h2 id="matches-title">Ближайшие матчи</h2>
          </div>
          <span class="tournament-matches__time">Время указано по МСК</span>
        </div>
        <div class="tournament-matches__grid">
          <RouterLink v-for="match in upcomingMatches" :key="match.id" :to="`/matches/${match.id}`" class="tournament-match" :class="{ 'tournament-match--featured': match.featured }" :aria-label="`Открыть матч ${match.team1} против ${match.team2}`">
            <div class="tournament-match__top"><span>{{ match.stage }}</span><time>{{ match.date }} · {{ match.time }}</time></div>
            <div class="tournament-match__teams">
              <div><b class="tournament-team-logo">{{ match.logo1 }}</b><strong>{{ match.team1 }}</strong></div>
              <span class="tournament-match__versus">VS</span>
              <div><strong>{{ match.team2 }}</strong><b class="tournament-team-logo tournament-team-logo--blue">{{ match.logo2 }}</b></div>
            </div>
            <footer><span>{{ match.map }}</span><span>Открыть матч <i aria-hidden="true">→</i></span></footer>
          </RouterLink>
        </div>
      </section>

      <section class="tournament-faq" aria-labelledby="faq-title">
        <div class="tournament-section-heading"><span>ПОМОЩЬ</span><h2 id="faq-title">Частые вопросы</h2></div>
        <div class="tournament-faq__list">
          <details v-for="(item, index) in faqItems" :key="item.question" :open="index === 0" name="tournament-faq">
            <summary><span><b>{{ String(index + 1).padStart(2, '0') }}</b>{{ item.question }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
            <p>{{ item.answer }}</p>
          </details>
        </div>
      </section>

      <section class="tournament-documents" aria-labelledby="documents-title">
        <div class="tournament-documents__header">
          <div class="tournament-section-heading"><span>ДОКУМЕНТЫ</span><h2 id="documents-title">Важно перед стартом</h2></div>
          <p>Ознакомьтесь с правилами до подачи заявки.</p>
        </div>
        <div class="tournament-documents__grid">
          <a v-for="document in documents" :key="document.href" :href="document.href" target="_blank" rel="noopener" class="tournament-document">
            <span class="tournament-document__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6"/></svg></span>
            <span class="tournament-document__content"><strong>{{ document.title }}</strong><small>{{ document.description }}</small><b>TXT · Открыть документ</b></span>
            <svg class="tournament-document__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>
          </a>
        </div>
      </section>
      </template>
    </div>

    <footer class="tournament-footer">
      <div class="tournament-page__container"><span>© 2026 CS2 COMMAND</span><span>Турнирная платформа Counter-Strike 2</span></div>
    </footer>
  </main>
</template>

<style scoped>
.tournament-page { --tp-bg: #07090d; --tp-surface: #11151e; --tp-border: rgba(173, 192, 229, .15); --tp-text: #f4f6fb; --tp-muted: #9ba7bd; --tp-dim: #63708a; --tp-hot: #ff3d73; --tp-blue: #8592ff; min-height: 100dvh; overflow: clip; color: var(--tp-text); background: radial-gradient(circle at 84% 5%, rgba(255, 61, 115, .16), transparent 26rem), radial-gradient(circle at 5% 21%, rgba(133, 146, 255, .13), transparent 25rem), var(--tp-bg); font-family: var(--font-family); }
.tournament-page__container { width: min(calc(100% - 48px), 1280px); margin: 0 auto; }
.tournament-page a:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
.tournament-nav { position: sticky; z-index: 20; top: 0; height: 76px; border-bottom: 1px solid var(--tp-border); background: rgba(7, 9, 13, .77); backdrop-filter: blur(20px); }
.tournament-nav__inner { display: flex; align-items: center; height: 100%; gap: 34px; }
.tournament-logo { color: #fff; font: 700 23px var(--font-display); letter-spacing: -.04em; }
.tournament-logo span { color: var(--tp-hot); }
.tournament-nav__links { display: flex; gap: 25px; margin-left: auto; }
.tournament-nav__links a, .tournament-nav__back { display: inline-flex; min-height: 44px; align-items: center; color: var(--tp-muted); font-size: 12px; font-weight: 700; transition: color .18s ease; }
.tournament-nav__links a:hover, .tournament-nav__back:hover { color: #fff; }
.tournament-nav__back { gap: 7px; padding: 0 2px; color: #fff; }
.tournament-nav__back span { color: var(--tp-hot); font-size: 15px; }
.tournament-crumbs { display: flex; gap: 9px; padding: 24px 0; color: var(--tp-dim); font-size: 12px; }
.tournament-crumbs a { color: var(--tp-muted); }
.tournament-api-state { display: flex; align-items: center; justify-content: center; gap: 18px; min-height: 360px; padding: 40px; border: 1px solid var(--tp-border); border-radius: 16px; background: rgba(17, 21, 30, .72); text-align: left; }
.tournament-api-state strong { font: 700 22px var(--font-display); }
.tournament-api-state p { margin: 7px 0 0; color: var(--tp-muted); line-height: 1.55; }
.tournament-api-state__loader { width: 28px; height: 28px; flex: 0 0 auto; border: 3px solid rgba(255,255,255,.16); border-top-color: var(--tp-hot); border-radius: 50%; animation: spin .8s linear infinite; }
.tournament-api-state--error { flex-direction: column; text-align: center; }
.tournament-api-state--error strong { color: #ff8baa; }
.tournament-api-state button { min-height: 44px; padding: 10px 18px; color: #fff; border: 1px solid rgba(255, 91, 139, .65); border-radius: 9px; background: #b8154a; font: 700 13px var(--font-family); cursor: pointer; }
.tournament-api-state button:hover { background: #d11b58; }
.tournament-api-state button:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
.tournament-hero { display: grid; grid-template-columns: minmax(300px, .83fr) minmax(0, 1.17fr); gap: clamp(30px, 6vw, 82px); align-items: center; min-height: 410px; padding: 22px 0 76px; }
.tournament-poster { position: relative; isolation: isolate; min-height: 386px; overflow: hidden; padding: 27px; border: 1px solid rgba(255,255,255,.2); border-radius: 18px; background: linear-gradient(145deg, #3d1835 0%, #15152e 45%, #080b14 100%); box-shadow: 0 28px 70px rgba(0, 0, 0, .35); font-family: var(--font-display); }
.tournament-poster::before { content: ''; position: absolute; z-index: -1; width: 310px; height: 310px; right: -82px; bottom: -92px; border: 1px solid rgba(255, 255, 255, .36); border-radius: 50%; box-shadow: 0 0 0 25px rgba(255, 255, 255, .035), 0 0 0 50px rgba(255, 255, 255, .025); }
.tournament-poster__glow { position: absolute; z-index: -1; top: 34px; right: 22px; width: 208px; height: 208px; border-radius: 50%; background: #ff3470; filter: blur(70px); opacity: .66; }
.tournament-poster__edition, .tournament-poster__game { display: block; font-size: 11px; font-weight: 700; letter-spacing: .13em; }
.tournament-poster__edition { color: #fff; }
.tournament-poster__game { margin-top: 7px; color: rgba(255,255,255,.6); }
.tournament-poster strong { position: relative; z-index: 1; display: block; margin-top: 54px; color: #fff; font-size: clamp(48px, 6vw, 78px); font-style: normal; line-height: .78; letter-spacing: -.085em; text-shadow: 0 8px 30px rgba(0,0,0,.2); }
.tournament-poster strong i { color: #ff6090; font-style: normal; }
.tournament-poster__date { position: absolute; z-index: 1; right: 27px; bottom: 28px; color: rgba(255,255,255,.87); font-size: 13px; font-weight: 700; line-height: 1.05; letter-spacing: .06em; text-align: right; }
.tournament-poster__grid { position: absolute; z-index: -1; inset: 0; opacity: .22; background-image: linear-gradient(rgba(255,255,255,.24) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.24) 1px, transparent 1px); background-size: 44px 44px; mask-image: linear-gradient(135deg, #000, transparent 68%); }
.tournament-live { display: inline-flex; align-items: center; gap: 9px; color: #ff94b1; font: 700 11px var(--font-display); letter-spacing: .13em; }
.tournament-live span { width: 8px; height: 8px; border-radius: 50%; background: var(--tp-hot); box-shadow: 0 0 0 5px rgba(255,61,115,.12); animation: pulse 1.8s ease-out infinite; }
.tournament-hero h1 { max-width: 680px; margin: 14px 0 15px; font: 700 clamp(38px, 5.5vw, 68px)/.96 var(--font-display); letter-spacing: -.065em; }
.tournament-hero__description { max-width: 610px; margin: 0; color: var(--tp-muted); font-size: 16px; line-height: 1.65; }
.tournament-hero__meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin: 30px 0 26px; border: 1px solid var(--tp-border); border-radius: 11px; overflow: hidden; background: var(--tp-border); }
.tournament-hero__meta div { min-height: 69px; padding: 12px 14px; background: rgba(17,21,30,.75); }
.tournament-hero__meta span, .tournament-hero__meta strong { display: block; }
.tournament-hero__meta span { margin-bottom: 5px; color: var(--tp-dim); font-size: 10px; font-weight: 700; letter-spacing: .06em; }
.tournament-hero__meta strong { font-size: 13px; }
.tournament-status { color: #78e2a8; }
.tournament-hero__action { display: inline-flex; min-height: 44px; align-items: center; gap: 12px; padding: 11px 15px; color: #fff; border: 1px solid rgba(255, 91, 139, .65); border-radius: 9px; background: linear-gradient(135deg, #ed2860, #b8154a); box-shadow: 0 9px 24px rgba(237,40,96,.23); font-size: 13px; font-weight: 700; transition: transform .18s ease, box-shadow .18s ease; }
.tournament-hero__action:hover { box-shadow: 0 13px 30px rgba(237,40,96,.35); transform: translateY(-1px); }
.tournament-hero__action:active { transform: scale(.98); }
.tournament-section-heading > span { display: block; margin-bottom: 9px; color: #ff8baa; font: 700 11px var(--font-display); letter-spacing: .13em; }
.tournament-section-heading h2 { margin: 0; font: 700 clamp(27px, 3.4vw, 38px)/1 var(--font-display); letter-spacing: -.05em; }
.tournament-overview { padding: 46px 0 64px; border-top: 1px solid var(--tp-border); }
.tournament-details { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 28px; }
.tournament-detail { min-height: 104px; padding: 18px; border: 1px solid var(--tp-border); border-radius: 12px; background: linear-gradient(145deg, rgba(27, 33, 45, .84), rgba(13, 16, 23, .82)); }
.tournament-detail span, .tournament-detail strong { display: block; }
.tournament-detail span { margin-bottom: 10px; color: var(--tp-dim); font-size: 11px; }
.tournament-detail strong { font: 700 17px var(--font-display); letter-spacing: -.025em; }
.tournament-rules { display: grid; grid-template-columns: 64px minmax(160px, .8fr) 1.35fr; align-items: center; gap: 22px; margin-top: 16px; padding: 24px; border: 1px solid rgba(133,146,255,.28); border-radius: 13px; background: linear-gradient(115deg, rgba(83,94,215,.16), rgba(17,21,30,.84) 46%); }
.tournament-rules__number { color: #aab2ff; font: 700 42px/.9 var(--font-display); letter-spacing: -.08em; }
.tournament-rules span { color: var(--tp-dim); font-size: 10px; font-weight: 700; letter-spacing: .09em; }
.tournament-rules h3 { margin: 7px 0 0; font: 700 19px var(--font-display); }
.tournament-rules p { margin: 0; color: var(--tp-muted); font-size: 13px; line-height: 1.65; }
.tournament-bracket-section { padding: 18px 0 70px; scroll-margin-top: 90px; }
.tournament-matches { padding: 55px 0 80px; border-top: 1px solid var(--tp-border); scroll-margin-top: 90px; }
.tournament-matches__header { display: flex; align-items: end; justify-content: space-between; gap: 20px; }
.tournament-matches__time { color: var(--tp-dim); font-size: 12px; }
.tournament-matches__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 28px; }
.tournament-match { display: flex; flex-direction: column; min-width: 0; min-height: 234px; padding: 18px; border: 1px solid var(--tp-border); border-radius: 13px; background: linear-gradient(145deg, rgba(24,29,40,.9), rgba(11,14,20,.9)); transition: border-color .18s ease, transform .18s ease, background .18s ease; }
.tournament-match:hover { border-color: rgba(255,105,150,.58); background: linear-gradient(145deg, rgba(42,29,45,.96), rgba(13,15,23,.94)); transform: translateY(-3px); }
.tournament-match--featured { border-color: rgba(255,83,132,.5); box-shadow: inset 0 1px rgba(255,255,255,.05), 0 18px 46px rgba(0,0,0,.16); }
.tournament-match__top { display: flex; justify-content: space-between; gap: 8px; color: var(--tp-dim); font-size: 10px; font-weight: 700; letter-spacing: .055em; }
.tournament-match--featured .tournament-match__top > span { color: #ff8baa; }
.tournament-match__teams { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 10px; flex: 1; padding: 22px 0; }
.tournament-match__teams > div { display: flex; align-items: center; gap: 9px; min-width: 0; }
.tournament-match__teams > div:last-child { justify-content: flex-end; text-align: right; }
.tournament-match__teams strong { min-width: 0; overflow: hidden; font: 700 15px var(--font-display); letter-spacing: -.025em; text-overflow: ellipsis; white-space: nowrap; }
.tournament-team-logo { display: grid; flex: 0 0 auto; width: 37px; height: 37px; place-items: center; border: 1px solid rgba(255,255,255,.28); border-radius: 10px; background: linear-gradient(145deg, #f4517e, #9e1240); color: #fff; font: 700 16px var(--font-display); }
.tournament-team-logo--blue { background: linear-gradient(145deg, #94a0ff, #323da1); }
.tournament-match__versus { color: var(--tp-dim); font: 600 11px var(--font-display); }
.tournament-match footer { display: flex; justify-content: space-between; gap: 8px; padding-top: 14px; border-top: 1px solid var(--tp-border); color: var(--tp-muted); font-size: 11px; }
.tournament-match footer span:last-child { color: #fff; font-weight: 700; }
.tournament-match footer i { color: #ff8baa; font-size: 15px; font-style: normal; }
.tournament-registration { padding: 64px 0 76px; border-top: 1px solid var(--tp-border); scroll-margin-top: 90px; }
.tournament-registration__layout { display: grid; grid-template-columns: minmax(0, .82fr) minmax(480px, 1.18fr); overflow: hidden; border: 1px solid rgba(255, 91, 139, .35); border-radius: 18px; background: linear-gradient(135deg, rgba(47, 24, 43, .9), rgba(15, 18, 27, .96) 52%); box-shadow: 0 28px 70px rgba(0,0,0,.22); }
.tournament-registration__intro { position: relative; isolation: isolate; overflow: hidden; padding: clamp(28px, 4.5vw, 56px); border-right: 1px solid var(--tp-border); }
.tournament-registration__intro::before { content: ''; position: absolute; z-index: -1; width: 320px; height: 320px; top: -170px; left: -130px; border: 1px solid rgba(255,255,255,.12); border-radius: 50%; box-shadow: 0 0 0 38px rgba(255,61,115,.035), 0 0 0 76px rgba(133,146,255,.025); }
.tournament-registration__status { display: inline-flex; align-items: center; gap: 9px; color: #ff9ab6; font: 700 10px var(--font-display); letter-spacing: .13em; }
.tournament-registration__status i { width: 7px; height: 7px; border-radius: 50%; background: var(--tp-hot); box-shadow: 0 0 0 5px rgba(255,61,115,.12); }
.tournament-registration__intro h2 { max-width: 470px; margin: 16px 0; font: 700 clamp(34px, 4.4vw, 54px)/.98 var(--font-display); letter-spacing: -.06em; }
.tournament-registration__intro > p { max-width: 540px; margin: 0; color: var(--tp-muted); font-size: 15px; line-height: 1.65; }
.tournament-registration__intro ol { display: grid; gap: 18px; margin: 36px 0 0; padding: 0; list-style: none; }
.tournament-registration__intro li { display: grid; grid-template-columns: 42px 1fr; gap: 14px; align-items: start; }
.tournament-registration__intro li > b { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid rgba(255,255,255,.17); border-radius: 10px; color: #ff8baa; background: rgba(255,255,255,.035); font: 700 12px var(--font-display); }
.tournament-registration__intro li span, .tournament-registration__intro li strong, .tournament-registration__intro li small { display: block; }
.tournament-registration__intro li strong { margin-bottom: 5px; font: 700 14px var(--font-display); }
.tournament-registration__intro li small { color: var(--tp-muted); font-size: 12px; line-height: 1.5; }
.tournament-registration__panel { display: grid; min-width: 0; min-height: 590px; padding: clamp(26px, 4vw, 50px); place-items: center; background: rgba(7,9,13,.46); }
.tournament-registration__panel form { width: 100%; }
.tournament-form__heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 25px; }
.tournament-form__heading span { color: var(--tp-dim); font: 700 10px var(--font-display); letter-spacing: .13em; }
.tournament-form__heading b { color: #b9c0ff; font-size: 11px; }
.tournament-form__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 14px; }
.tournament-form__grid label { display: block; min-width: 0; }
.tournament-form__grid label > span { display: block; margin-bottom: 8px; color: #cbd2df; font-size: 12px; font-weight: 700; }
.tournament-form__grid input, .tournament-form__grid select { width: 100%; min-height: 48px; padding: 12px 13px; color: var(--tp-text); border: 1px solid rgba(173,192,229,.22); border-radius: 9px; outline: 0; background: #0e121a; font: 400 14px var(--font-family); transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
.tournament-form__grid input::placeholder { color: #606b80; }
.tournament-form__grid input:hover, .tournament-form__grid select:hover { border-color: rgba(173,192,229,.4); }
.tournament-form__grid input:focus, .tournament-form__grid select:focus { border-color: #ff6e99; background: #111620; box-shadow: 0 0 0 3px rgba(255,61,115,.13); }
.tournament-form__players { grid-column: 1 / -1; }
.tournament-form__agreement { display: flex; align-items: flex-start; gap: 11px; min-height: 44px; margin: 21px 0 16px; color: var(--tp-muted); font-size: 12px; line-height: 1.55; cursor: pointer; }
.tournament-form__agreement input { width: 18px; height: 18px; flex: 0 0 auto; margin: 1px 0 0; accent-color: var(--tp-hot); }
.tournament-form__agreement a { color: #ff9ab6; text-decoration: underline; text-underline-offset: 3px; }
.tournament-form__error { margin: 0 0 14px; padding: 10px 12px; color: #ffc0d2; border: 1px solid rgba(255,61,115,.4); border-radius: 8px; background: rgba(255,61,115,.09); font-size: 12px; line-height: 1.5; }
.tournament-registration__panel form > button { display: flex; width: 100%; min-height: 50px; align-items: center; justify-content: space-between; padding: 12px 16px; color: #fff; border: 1px solid #ff5c89; border-radius: 9px; background: linear-gradient(135deg, #ed2860, #a90e40); box-shadow: 0 12px 28px rgba(237,40,96,.2); font: 700 13px var(--font-family); cursor: pointer; transition: background .18s ease, box-shadow .18s ease, opacity .18s ease; }
.tournament-registration__panel form > button:hover:not(:disabled) { background: linear-gradient(135deg, #fa3b70, #bd174d); box-shadow: 0 15px 32px rgba(237,40,96,.31); }
.tournament-registration__panel form > button:active:not(:disabled) { opacity: .82; }
.tournament-registration__panel form > button:disabled { cursor: wait; opacity: .55; }
.tournament-registration__panel form > button:focus-visible, .tournament-registration__success button:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
.tournament-registration__panel form > button i { color: #ffd3df; font-size: 18px; font-style: normal; }
.tournament-form__note { display: block; margin-top: 12px; color: var(--tp-dim); font-size: 11px; text-align: center; }
.tournament-registration__success { max-width: 390px; text-align: center; }
.tournament-registration__success > svg { width: 62px; height: 62px; margin-bottom: 22px; padding: 15px; color: #8ce6b5; border: 1px solid rgba(120,226,168,.5); border-radius: 50%; background: rgba(120,226,168,.09); fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.tournament-registration__success > span { display: block; color: #8ce6b5; font: 700 10px var(--font-display); letter-spacing: .13em; }
.tournament-registration__success h3 { margin: 10px 0; font: 700 28px var(--font-display); letter-spacing: -.04em; }
.tournament-registration__success p { margin: 0 0 24px; color: var(--tp-muted); line-height: 1.6; }
.tournament-registration__success button { min-height: 44px; padding: 10px 16px; color: #fff; border: 1px solid var(--tp-border); border-radius: 8px; background: #171c27; font-weight: 700; cursor: pointer; }
.tournament-registration__success button:hover { border-color: rgba(255,255,255,.34); background: #1d2431; }
.tournament-applications { padding: 66px 0 76px; border-top: 1px solid var(--tp-border); scroll-margin-top: 90px; }
.tournament-applications__header { display: flex; align-items: end; justify-content: space-between; gap: 28px; }
.tournament-applications__counter { display: flex; align-items: center; gap: 11px; min-width: 150px; justify-content: flex-end; }
.tournament-applications__counter strong { color: #fff; font: 700 42px/.9 var(--font-display); letter-spacing: -.06em; font-variant-numeric: tabular-nums; }
.tournament-applications__counter span { color: var(--tp-dim); font-size: 10px; font-weight: 700; line-height: 1.35; letter-spacing: .06em; text-transform: uppercase; }
.tournament-applications__table { margin-top: 28px; overflow: hidden; border: 1px solid var(--tp-border); border-radius: 14px; background: rgba(13,16,23,.78); }
.tournament-applications__row { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(90px, .5fr) minmax(90px, .45fr) minmax(180px, .8fr); gap: 20px; align-items: center; min-height: 88px; padding: 15px 20px; border-top: 1px solid var(--tp-border); }
.tournament-applications__row--head { min-height: 43px; padding-top: 10px; padding-bottom: 10px; border-top: 0; background: rgba(255,255,255,.025); color: var(--tp-dim); font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.tournament-applications__team { display: flex; align-items: center; gap: 13px; min-width: 0; }
.tournament-applications__team > b { display: grid; width: 46px; height: 46px; flex: 0 0 auto; place-items: center; border: 1px solid rgba(133,146,255,.36); border-radius: 12px; background: linear-gradient(145deg, rgba(133,146,255,.2), rgba(63,72,163,.13)); color: #c3c9ff; font: 700 14px var(--font-display); letter-spacing: -.02em; }
.tournament-applications__team > span, .tournament-applications__team strong, .tournament-applications__team small { display: block; min-width: 0; }
.tournament-applications__team strong { overflow: hidden; font: 700 15px var(--font-display); text-overflow: ellipsis; white-space: nowrap; }
.tournament-applications__team small { margin-top: 5px; color: var(--tp-dim); font-size: 9px; letter-spacing: .08em; }
.tournament-applications__cell > small { display: none; }
.tournament-applications__cell > strong, .tournament-applications__cell > time { color: #cbd2df; font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tournament-application-status { display: inline-flex; align-items: center; gap: 10px; }
.tournament-application-status > i { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; background: #f5c15d; box-shadow: 0 0 0 5px rgba(245,193,93,.09); }
.tournament-application-status > span, .tournament-application-status strong, .tournament-application-status small { display: block; }
.tournament-application-status strong { color: #f3cf83; font-size: 12px; }
.tournament-application-status small { margin-top: 3px; color: var(--tp-dim); font-size: 9px; }
.tournament-application-status--approved > i { background: #78e2a8; box-shadow: 0 0 0 5px rgba(120,226,168,.09); }
.tournament-application-status--approved strong { color: #91e9b8; }
.tournament-application-status--rejected > i { background: #ff668f; box-shadow: 0 0 0 5px rgba(255,102,143,.09); }
.tournament-application-status--rejected strong { color: #ff91ae; }
.tournament-applications__loading { display: grid; gap: 9px; margin-top: 28px; }
.tournament-applications__loading span { height: 82px; border: 1px solid var(--tp-border); border-radius: 12px; background: linear-gradient(100deg, rgba(24,29,40,.78) 20%, rgba(42,48,63,.86) 40%, rgba(24,29,40,.78) 60%); background-size: 220% 100%; animation: application-loading 1.4s ease-in-out infinite; }
.tournament-applications__message { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 140px; margin-top: 28px; padding: 24px; border: 1px solid var(--tp-border); border-radius: 14px; background: linear-gradient(145deg, rgba(24,29,40,.82), rgba(11,14,20,.86)); }
.tournament-applications__message strong { display: block; font: 700 17px var(--font-display); }
.tournament-applications__message p { margin: 7px 0 0; color: var(--tp-muted); font-size: 13px; line-height: 1.55; }
.tournament-applications__message button, .tournament-applications__message > a { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; flex: 0 0 auto; padding: 10px 16px; color: #fff; border: 1px solid rgba(255,91,139,.58); border-radius: 8px; background: #a90e40; font-size: 12px; font-weight: 700; cursor: pointer; }
.tournament-applications__message button:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
.tournament-applications__message--empty { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; }
.tournament-applications__empty-icon { display: grid; width: 52px; height: 52px; place-items: center; border: 1px solid rgba(133,146,255,.3); border-radius: 13px; background: rgba(133,146,255,.08); color: #aab2ff; }
.tournament-applications__empty-icon svg { width: 25px; height: 25px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.tournament-faq { padding: 70px 0 76px; border-top: 1px solid var(--tp-border); }
.tournament-faq__list { display: grid; gap: 10px; max-width: 920px; margin: 28px auto 0; }
.tournament-faq details { overflow: hidden; border: 1px solid var(--tp-border); border-radius: 11px; background: linear-gradient(145deg, rgba(24,29,40,.85), rgba(11,14,20,.85)); transition: border-color .2s ease, background .2s ease; }
.tournament-faq details[open] { border-color: rgba(133,146,255,.37); background: linear-gradient(145deg, rgba(35,39,64,.82), rgba(13,16,24,.9)); }
.tournament-faq summary { display: flex; min-height: 64px; align-items: center; justify-content: space-between; gap: 20px; padding: 17px 19px; color: var(--tp-text); cursor: pointer; list-style: none; font: 700 15px var(--font-display); }
.tournament-faq summary::-webkit-details-marker { display: none; }
.tournament-faq summary > span { display: flex; align-items: center; gap: 16px; }
.tournament-faq summary b { color: #8995ff; font-size: 11px; letter-spacing: .08em; }
.tournament-faq summary svg { width: 22px; height: 22px; flex: 0 0 auto; color: #ff8baa; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; transition: transform .2s ease; }
.tournament-faq details[open] summary svg { transform: rotate(180deg); }
.tournament-faq summary:focus-visible { outline: 2px solid #fff; outline-offset: -4px; }
.tournament-faq details p { max-width: 760px; margin: 0; padding: 0 60px 22px; color: var(--tp-muted); font-size: 14px; line-height: 1.7; }
.tournament-documents { padding: 68px 0 84px; border-top: 1px solid var(--tp-border); }
.tournament-documents__header { display: flex; align-items: end; justify-content: space-between; gap: 30px; }
.tournament-documents__header > p { max-width: 390px; margin: 0; color: var(--tp-muted); font-size: 13px; line-height: 1.6; text-align: right; }
.tournament-documents__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 28px; }
.tournament-document { position: relative; display: grid; grid-template-columns: 46px minmax(0, 1fr) 24px; gap: 13px; align-items: start; min-height: 164px; padding: 19px; overflow: hidden; color: var(--tp-text); border: 1px solid var(--tp-border); border-radius: 13px; background: linear-gradient(145deg, rgba(24,29,40,.9), rgba(11,14,20,.9)); transition: border-color .2s ease, background .2s ease, transform .2s ease; }
.tournament-document:hover { border-color: rgba(255,105,150,.52); background: linear-gradient(145deg, rgba(42,29,45,.94), rgba(13,15,23,.94)); transform: translateY(-3px); }
.tournament-document:active { transform: translateY(-1px); }
.tournament-document__icon { display: grid; width: 46px; height: 46px; place-items: center; border: 1px solid rgba(133,146,255,.35); border-radius: 11px; background: rgba(133,146,255,.1); color: #aab2ff; }
.tournament-document__icon svg { width: 23px; height: 23px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.tournament-document__content, .tournament-document__content strong, .tournament-document__content small, .tournament-document__content b { display: block; }
.tournament-document__content strong { margin: 2px 0 8px; font: 700 15px var(--font-display); }
.tournament-document__content small { color: var(--tp-muted); font-size: 12px; line-height: 1.55; }
.tournament-document__content b { margin-top: 18px; color: #ff8baa; font-size: 9px; letter-spacing: .075em; }
.tournament-document__arrow { width: 22px; height: 22px; color: var(--tp-dim); fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; transition: color .2s ease, transform .2s ease; }
.tournament-document:hover .tournament-document__arrow { color: #fff; transform: translate(2px, -2px); }
.tournament-footer { padding: 28px 0; border-top: 1px solid var(--tp-border); color: var(--tp-dim); font-size: 11px; }
.tournament-footer .tournament-page__container { display: flex; justify-content: space-between; gap: 20px; }
@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .45; transform: scale(.72); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes application-loading { from { background-position: 100% 0; } to { background-position: -100% 0; } }
@keyframes enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: no-preference) { .tournament-hero { animation: enter .42s ease-out both; } .tournament-overview { animation: enter .42s .08s ease-out both; } }
@media (max-width: 1000px) { .tournament-registration__layout { grid-template-columns: 1fr; } .tournament-registration__intro { border-right: 0; border-bottom: 1px solid var(--tp-border); } .tournament-registration__panel { min-height: auto; } .tournament-documents__grid { grid-template-columns: 1fr; } .tournament-document { min-height: auto; } }
@media (max-width: 900px) { .tournament-hero { grid-template-columns: minmax(260px, .7fr) 1fr; gap: 30px; } .tournament-details { grid-template-columns: repeat(2, 1fr); } .tournament-matches__grid { grid-template-columns: 1fr; } .tournament-match { min-height: 184px; } }
@media (max-width: 700px) { .tournament-page__container { width: min(calc(100% - 32px), 680px); } .tournament-nav { height: auto; } .tournament-nav__inner { flex-wrap: wrap; min-height: 68px; padding: 10px 0; gap: 8px 20px; } .tournament-nav__links { order: 3; width: 100%; gap: 20px; margin: 0; overflow-x: auto; scrollbar-width: none; } .tournament-nav__links::-webkit-scrollbar { display: none; } .tournament-nav__links a { flex: 0 0 auto; } .tournament-nav__back { margin-left: auto; } .tournament-crumbs { overflow: hidden; padding: 18px 0; white-space: nowrap; } .tournament-hero { grid-template-columns: 1fr; gap: 28px; padding: 12px 0 54px; } .tournament-poster { min-height: 300px; padding: 21px; border-radius: 14px; } .tournament-poster strong { margin-top: 38px; font-size: 58px; } .tournament-poster__date { right: 21px; bottom: 21px; } .tournament-hero h1 { font-size: 42px; } .tournament-hero__description { font-size: 15px; } .tournament-hero__meta { grid-template-columns: 1fr 1fr; } .tournament-overview { padding: 38px 0 46px; } .tournament-details { gap: 10px; margin-top: 22px; } .tournament-detail { min-height: 92px; padding: 14px; } .tournament-detail strong { font-size: 15px; } .tournament-rules { grid-template-columns: 42px 1fr; gap: 14px; padding: 18px; } .tournament-rules__number { font-size: 34px; } .tournament-rules p { grid-column: 1 / -1; font-size: 13px; } .tournament-registration { padding: 46px 0 52px; } .tournament-registration__layout { border-radius: 14px; } .tournament-registration__intro, .tournament-registration__panel { padding: 24px 18px; } .tournament-registration__intro h2 { font-size: 38px; } .tournament-form__grid { grid-template-columns: 1fr; } .tournament-form__players { grid-column: auto; } .tournament-form__grid input, .tournament-form__grid select { font-size: 16px; } .tournament-applications { padding: 46px 0 52px; } .tournament-applications__header { align-items: start; flex-direction: column; gap: 18px; } .tournament-applications__counter { justify-content: flex-start; } .tournament-applications__table { border: 0; background: transparent; } .tournament-applications__row--head { display: none; } .tournament-applications__row { grid-template-columns: 1fr 1fr; gap: 18px 12px; min-height: 0; margin-bottom: 10px; padding: 16px; border: 1px solid var(--tp-border); border-radius: 12px; background: linear-gradient(145deg, rgba(24,29,40,.9), rgba(11,14,20,.9)); } .tournament-applications__team { grid-column: 1 / -1; padding-bottom: 14px; border-bottom: 1px solid var(--tp-border); } .tournament-applications__cell > small { display: block; margin-bottom: 6px; color: var(--tp-dim); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; } .tournament-applications__cell:last-child { grid-column: 1 / -1; } .tournament-applications__message, .tournament-applications__message--empty { display: flex; align-items: flex-start; flex-direction: column; } .tournament-applications__message > a, .tournament-applications__message button { width: 100%; } .tournament-bracket-section { padding-bottom: 48px; } .tournament-matches { padding: 42px 0 58px; } .tournament-matches__header { align-items: start; flex-direction: column; gap: 12px; } .tournament-matches__grid { margin-top: 22px; } .tournament-match { min-height: 178px; } .tournament-faq, .tournament-documents { padding: 48px 0 54px; } .tournament-faq summary { padding: 15px; font-size: 14px; } .tournament-faq summary > span { gap: 10px; } .tournament-faq details p { padding: 0 15px 18px 39px; font-size: 13px; } .tournament-documents__header { align-items: start; flex-direction: column; gap: 14px; } .tournament-documents__header > p { text-align: left; } .tournament-document { grid-template-columns: 42px minmax(0, 1fr) 20px; padding: 16px; } .tournament-document__icon { width: 42px; height: 42px; } .tournament-footer .tournament-page__container { flex-direction: column; gap: 9px; } }
@media (prefers-reduced-motion: reduce) { .tournament-page *, .tournament-page *::before, .tournament-page *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
</style>
