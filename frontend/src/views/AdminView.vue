<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import axios from 'axios'
import AdminTournamentForm from '@/components/admin/AdminTournamentForm.vue'
import AdminContentForm from '@/components/admin/AdminContentForm.vue'
import AdminMatchesForm from '@/components/admin/AdminMatchesForm.vue'
import AdminBracketForm from '@/components/admin/AdminBracketForm.vue'
import { prepareTournament, clone, renumberTeams, syncLinkedMatches, validateTournament } from '@/utils/adminTournament'
import { readTournamentVersion, mergeTournamentDraft, conflictLabel, conflictValue } from '@/utils/adminSaving'
const tabs = [ ['settings', 'Турнир'], ['content', 'Тексты'], ['teams', 'Команды'], ['matches', 'Матчи'], ['bracket', 'Сетка'], ['applications', 'Заявки'] ]
const draft = ref(null), baseline = ref(''), etag = ref(''), key = ref(''), requiresKey = ref(null)
const tab = ref('settings'), busy = ref(false), saving = ref(false), error = ref(''), notice = ref('')
const applications = ref([]), applicationsError = ref(''), applicationBusy = ref('')
const newTeam = ref(''), search = ref(''), applicationFilter = ref('all')
const conflict = ref(null)
const dirty = computed(() => draft.value && JSON.stringify(draft.value) !== baseline.value)
const headers = () => key.value ? { 'X-Admin-Key': key.value } : {}
const statuses = { pending: 'На проверке', waitpay: 'Ожидание взноса', approved: 'Допущена', yes: 'Участвуют', rejected: 'Отклонена' }
const filteredApplications = computed(() => applications.value.filter(item => (applicationFilter.value === 'all' || item.status === applicationFilter.value) && `${item.teamName} ${item.captainName}`.toLowerCase().includes(search.value.toLowerCase())))
function errorText(reason) {
  if (reason.response?.status === 401) return 'Ключ не подошёл. Проверьте ключ администратора.'
  const detail = reason.response?.data?.detail
  if (Array.isArray(detail)) return detail.map(item => `${item.loc?.filter(part => part !== 'body').join(' → ')}: ${item.msg}`).join('\n')
  return typeof detail === 'string' ? detail : reason.message === 'Network Error' ? 'Не удалось связаться с сервером. Попробуйте ещё раз.' : reason.message || 'Не удалось выполнить действие.'
}
async function loadApplications() {
  applicationsError.value = ''
  try { applications.value = (await axios.get('/api/admin/registrations', { headers: headers() })).data }
  catch (reason) { applicationsError.value = errorText(reason) }
}
async function loadTournament() {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try {
    const response = await axios.get('/api/admin/tournament', { headers: headers() })
    draft.value = prepareTournament(response.data)
    baseline.value = JSON.stringify(draft.value); etag.value = readTournamentVersion(response.headers)
    conflict.value = null
    await loadApplications()
  } catch (reason) { error.value = errorText(reason) }
  finally { busy.value = false }
}
async function persist(data, version) {
  validateTournament(data)
  syncLinkedMatches(data)
  validateTournament(data)
  const response = await axios.put('/api/admin/tournament', data, { headers: { ...headers(), ...(version ? { 'If-Match': version } : {}) } })
  draft.value = prepareTournament(response.data.tournament); baseline.value = JSON.stringify(draft.value)
  etag.value = readTournamentVersion(response.headers)
  conflict.value = null
  notice.value = 'Сохранено. Изменения опубликованы на сайте.'
}
async function save() {
  if (saving.value || !dirty.value || conflict.value) return
  error.value = ''; notice.value = ''; saving.value = true
  try { await persist(clone(draft.value), etag.value) }
  catch (reason) {
    if (reason.response?.status !== 409) error.value = errorText(reason)
    else {
      try {
        const response = await axios.get('/api/admin/tournament', { headers: headers() })
        const current = prepareTournament(response.data)
        const context = { base: JSON.parse(baseline.value), local: clone(draft.value), remote: current, version: readTournamentVersion(response.headers) }
        const merged = mergeTournamentDraft(context.base, context.local, context.remote)
        if (merged.conflicts.length) {
          conflict.value = { ...context, fields: merged.conflicts }
          await nextTick(); document.querySelector('.admin-conflict')?.focus()
        } else {
          await persist(merged.data, context.version)
          notice.value = 'Сохранено. Ваши правки объединены с новыми данными сервера.'
        }
      } catch (recoveryError) { error.value = errorText(recoveryError) }
    }
  } finally { saving.value = false }
}
function resolveConflict(preference) {
  const context = conflict.value
  const merged = mergeTournamentDraft(context.base, context.local, context.remote, preference)
  draft.value = merged.data
  baseline.value = JSON.stringify(context.remote); etag.value = context.version
  conflict.value = null; error.value = ''
  notice.value = dirty.value ? 'Выбранные значения применены. Нажмите «Сохранить».' : 'Актуальные данные загружены.'
}
function reload() { if (!dirty.value || window.confirm('Загрузить данные с сервера и отменить несохранённые правки?')) loadTournament() }
function logout() { if (!dirty.value || window.confirm('Выйти и отменить несохранённые правки?')) { draft.value = null; key.value = ''; error.value = ''; notice.value = ''; conflict.value = null } }
function changeSeeds(change) {
  if (Object.keys(draft.value.results).length && !window.confirm('Изменение состава или посева сбросит результаты сетки. Продолжить?')) return false
  change(); renumberTeams(draft.value.teams); draft.value.results = {}; syncLinkedMatches(draft.value)
  return true
}
function addTeam(name = newTeam.value) {
  error.value = ''; name = name.trim()
  if (!name) { error.value = 'Введите название команды.'; return }
  if (draft.value.teams.some(team => team.name.toLowerCase() === name.toLowerCase())) { error.value = 'Команда с таким названием уже есть в сетке.'; return }
  if (changeSeeds(() => draft.value.teams.push({ id: `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name, seed: draft.value.teams.length + 1 }))) newTeam.value = ''
}
function moveTeam(index, offset) { changeSeeds(() => { const other = index + offset; [draft.value.teams[index], draft.value.teams[other]] = [draft.value.teams[other], draft.value.teams[index]] }) }
function removeTeam(team) {
  error.value = ''
  if (draft.value.teams.length === 1) { error.value = 'Оставьте хотя бы одну команду для подготовки турнира.'; return }
  const related = Object.values(draft.value.matches).filter(match => [match.team1Id, match.team2Id].includes(team.id))
  if (related.length) { error.value = `Команда участвует в матчах: ${related.map(match => match.stage).join(', ')}. Сначала измените участников или удалите эти матчи.`; return }
  if (window.confirm(`Удалить команду «${team.name}» из сетки?`)) changeSeeds(() => { draft.value.teams = draft.value.teams.filter(item => item.id !== team.id) })
}
async function changeApplication(item, value) {
  if (applicationBusy.value) return
  applicationBusy.value = item.id; applicationsError.value = ''
  try {
    const response = await axios.patch(`/api/admin/registrations/${encodeURIComponent(item.id)}`, { status: value }, { headers: headers() })
    const index = applications.value.findIndex(application => application.id === item.id); applications.value[index] = response.data
  } catch (reason) { applicationsError.value = errorText(reason) }
  finally { applicationBusy.value = '' }
}
function exportDraft() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(draft.value, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'tournament-backup.json'; link.click(); URL.revokeObjectURL(url)
}
function beforeUnload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
watch(error, async value => { if (value) { await nextTick(); document.querySelector('.admin-feedback')?.focus() } })
onBeforeRouteLeave(() => !dirty.value || window.confirm('Есть несохранённые правки. Выйти без сохранения?'))
onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnload)
  try { requiresKey.value = (await axios.get('/api/admin/access')).data.requiresKey; if (!requiresKey.value) await loadTournament() }
  catch (reason) { error.value = errorText(reason) }
})
onUnmounted(() => { window.removeEventListener('beforeunload', beforeUnload); key.value = '' })
</script>
<template>
  <div class="admin-page site-width">
    <a class="skip-link" href="#admin-content">К редактированию</a>
    <header class="admin-header"><RouterLink class="admin-brand" to="/">CS2 Command<span class="accent">.</span></RouterLink><div class="admin-row-actions"><RouterLink to="/" target="_blank">Открыть сайт ↗</RouterLink><button v-if="draft && requiresKey" type="button" :disabled="saving || busy" class="text-button" @click="logout">Выйти</button></div></header>
    <main id="admin-content">
      <div class="admin-intro"><span class="section-kicker accent">УПРАВЛЕНИЕ ТУРНИРОМ</span><h1>Админ-панель</h1><p>Всё важное — в одном месте.</p></div>
      <p v-if="error" class="inline-message admin-feedback" role="alert" tabindex="-1">{{ error }}</p>
      <section v-if="conflict" class="admin-conflict" tabindex="-1" aria-labelledby="conflict-title" role="alert">
        <h2 id="conflict-title">Выберите, какие значения оставить</h2>
        <p>Ваши правки сохранены в панели. На сервере изменились те же поля; остальные изменения будут объединены автоматически.</p>
        <details v-for="field in conflict.fields" :key="field.path.join('.')"><summary>{{ conflictLabel(field.path, draft) }}</summary><div class="admin-conflict-values"><div><strong>Ваше значение</strong><pre>{{ conflictValue(field.local) }}</pre></div><div><strong>На сервере</strong><pre>{{ conflictValue(field.remote) }}</pre></div></div></details>
        <div class="admin-row-actions"><button type="button" class="admin-secondary" @click="resolveConflict('local')">Оставить мои значения</button><button type="button" class="admin-secondary" @click="resolveConflict('remote')">Принять значения с сервера</button></div>
      </section>
      <div v-if="!draft" class="admin-login">
        <h2>{{ requiresKey ? 'Вход администратора' : 'Открыть управление' }}</h2>
        <p v-if="requiresKey">Введите ключ администратора. Он действует только в этой открытой вкладке.</p>
        <p v-else-if="requiresKey === false">Пароль администратора не настроен.</p>
        <form @submit.prevent="loadTournament"><label v-if="requiresKey !== false">Ключ администратора<input v-model="key" type="password" autocomplete="current-password" :required="requiresKey === true" autofocus></label><button class="pill-button" type="submit" :disabled="busy">{{ busy ? 'Открываем…' : 'Войти' }}</button></form>
      </div>
      <template v-else>
        <div class="admin-overview"><div><span>Команды в сетке</span><strong>{{ draft.teams.length }}</strong></div><div><span>Матчи</span><strong>{{ Object.keys(draft.matches).length }}</strong></div><div><span>Заявки на проверке</span><strong>{{ applications.filter(item => item.status === 'pending').length }}</strong></div><div><span>Изменения</span><strong :class="{ accent: dirty }">{{ dirty ? 'Не сохранены' : 'Сохранены' }}</strong></div></div>
        <nav class="admin-tabs" aria-label="Разделы админ-панели"><button v-for="[id, label] in tabs" :key="id" type="button" :aria-pressed="tab === id" @click="tab = id">{{ label }}</button></nav>
        <p v-if="requiresKey === false" class="admin-local-note">Вход открыт без пароля. Пароль настраивается в параметрах запуска сервера.</p>
        <form class="admin-form" @submit.prevent="save" :aria-busy="saving" novalidate>
          <fieldset :disabled="saving || busy || Boolean(conflict)" class="admin-form-body">
            <AdminTournamentForm v-if="tab === 'settings'" :draft="draft" />
            <AdminContentForm v-else-if="tab === 'content'" :draft="draft" />
            <section v-else-if="tab === 'teams'" aria-labelledby="admin-teams-title"><h2 id="admin-teams-title">Команды и посев</h2><p class="admin-hint">Порядок команд определяет посев: первая команда получает №1. Список заявок и участники сетки — разные списки; добавляйте в сетку подтверждённые команды.</p><div class="admin-add-team"><label>Название новой команды<input v-model.trim="newTeam" maxlength="80" @keydown.enter.prevent="addTeam()" placeholder="Название команды"></label><button class="admin-secondary" type="button" @click="addTeam()">+ Добавить команду</button></div><ol class="admin-team-list"><li v-for="(team, index) in draft.teams" :key="team.id"><span class="admin-seed">{{ team.seed }}</span><label>Название команды {{ team.seed }}<input v-model.trim="team.name" maxlength="80" required></label><div class="admin-row-actions"><button type="button" class="admin-icon-button" :aria-label="`Поднять ${team.name}`" :disabled="index === 0" @click="moveTeam(index, -1)">↑</button><button type="button" class="admin-icon-button" :aria-label="`Опустить ${team.name}`" :disabled="index === draft.teams.length - 1" @click="moveTeam(index, 1)">↓</button><button type="button" class="text-button accent" @click="removeTeam(team)">Удалить</button></div></li></ol></section>
            <AdminMatchesForm v-else-if="tab === 'matches'" :draft="draft" />
            <AdminBracketForm v-else-if="tab === 'bracket'" :draft="draft" />
            <section v-else aria-labelledby="admin-applications-title"><div class="admin-card-heading"><h2 id="admin-applications-title">Заявки команд</h2><button type="button" class="text-button" @click="loadApplications">Обновить список</button></div><p class="admin-hint">Контакты капитанов видны только здесь. Изменение статуса заявки сохраняется сразу; добавление команды в сетку — после кнопки «Сохранить».</p><p v-if="applicationsError" class="inline-message" role="alert">{{ applicationsError }}</p><div class="admin-fields"><label>Поиск команды или капитана<input v-model="search" type="search" placeholder="Название или имя"></label><label>Статус заявки<select aria-label="Статус заявки" v-model="applicationFilter"><option value="all">Все заявки</option><option v-for="(label, value) in statuses" :key="value" :value="value">{{ label }}</option></select></label></div><p v-if="!filteredApplications.length" class="admin-empty">{{ applications.length ? 'По этим условиям заявок нет.' : 'Заявок пока нет.' }}</p><article v-for="item in filteredApplications" :key="item.id" class="admin-application admin-edit-card"><div class="admin-card-heading"><h3>{{ item.teamName }}</h3><span>{{ item.players }} игроков</span></div><dl><div><dt>Капитан</dt><dd>{{ item.captainName }}</dd></div><div><dt>Email</dt><dd><a :href="`mailto:${item.email}`">{{ item.email }}</a></dd></div><div><dt>Контакт</dt><dd>{{ item.contact }}</dd></div></dl><div class="admin-fields"><label>Статус: {{ item.teamName }}<select :aria-label="`Статус: ${item.teamName}`" :value="item.status" :disabled="Boolean(applicationBusy)" @change="changeApplication(item, $event.target.value)"><option v-for="(label, value) in statuses" :key="value" :value="value">{{ label }}</option></select></label><button type="button" class="admin-secondary" :disabled="!['approved', 'yes'].includes(item.status) || draft.teams.some(team => team.name.toLowerCase() === item.teamName.toLowerCase())" @click="addTeam(item.teamName)">{{ draft.teams.some(team => team.name.toLowerCase() === item.teamName.toLowerCase()) ? 'Уже в сетке' : 'Добавить в сетку' }}</button></div></article></section>
          </fieldset>
          <div class="admin-save-bar"><div><strong :class="{ accent: dirty }">{{ saving ? 'Сохраняем…' : dirty ? 'Есть несохранённые правки' : 'Все изменения сохранены' }}</strong><p v-if="notice" role="status">{{ notice }}</p><p v-else>Правки появятся на сайте после сохранения.</p></div><div class="admin-row-actions"><button class="admin-secondary" type="button" :disabled="saving || busy" @click="reload">Отменить правки</button><button class="pill-button" type="submit" :disabled="!dirty || saving || busy || Boolean(conflict)">{{ saving ? 'Сохраняем…' : 'Сохранить' }} <span v-if="!saving" class="accent" aria-hidden="true">↗</span></button></div></div>
        </form>
        <div class="admin-footer"><button type="button" class="text-button" @click="exportDraft">Скачать копию данных</button><span>Копия включает текущие несохранённые правки.</span></div>
      </template>
    </main>
  </div>
</template>
<style scoped>
.admin-page { padding-bottom: 32px; }
.admin-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px 0; border-bottom: 1px solid #000; }
.admin-brand { font: 700 24px var(--font-display); text-decoration: none; }
.admin-row-actions { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.admin-intro { padding: 40px 0 24px; }
.admin-intro h1 { font-size: clamp(32px, 4vw, 48px); margin: 12px 0; }
.admin-intro p { margin: 0; }
.admin-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-block: 1px solid #000; padding: 20px 0; gap: 20px; }
.admin-overview span { display: block; font-size: 13px; color: #555; margin-bottom: 8px; }
.admin-overview strong { font-size: 24px; overflow-wrap: anywhere; }
.admin-tabs { display: flex; flex-wrap: wrap; border: 1px solid #000; margin: 24px 0; }
.admin-tabs button { flex: 1; padding: 14px 16px; background: #fff; border: 0; border-right: 1px solid #000; color: #000; }
.admin-tabs button:last-child { border-right: 0; }
.admin-tabs button[aria-pressed='true'] { background: #000; color: #fff; }
.admin-tabs button:hover { background: #eee; color: #000; }
.admin-local-note { font-size: 13px; color: #555; }
.admin-form-body { padding: 0; margin: 32px 0; border: 0; min-width: 0; }
.admin-form { min-width: 0; }
.admin-login { max-width: 500px; border: 1px solid #000; padding: 28px; margin: 20px 0 60px; }
.admin-login form { display: grid; gap: 20px; }
.admin-feedback { white-space: pre-line; }
.admin-conflict { margin-block: 24px; padding: 24px; border: 1px solid #000; border-left: 3px solid var(--accent); }
.admin-conflict details { padding-block: 12px; border-top: 1px solid #000; }
.admin-conflict summary { cursor: pointer; padding-block: 10px; }
.admin-conflict-values { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.admin-conflict pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; font-size: 14px; }
.admin-conflict .admin-row-actions { margin-top: 20px; }
.admin-save-bar { position: sticky; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 18px 20px; border: 1px solid #000; background: #fff; z-index: 5; box-shadow: 0 -6px 16px #00000008; }
.admin-save-bar p { font-size: 13px; margin: 6px 0 0; }
.admin-footer { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-top: 24px; font-size: 13px; color: #555; }
.admin-add-team { display: flex; gap: 16px; align-items: end; margin: 24px 0; }
.admin-add-team label { flex: 1; }
.admin-team-list { padding: 0; list-style: none; }
.admin-team-list li { display: flex; gap: 16px; align-items: center; padding: 16px 0; border-top: 1px solid #000; }
.admin-team-list label { flex: 1; min-width: 0; }
.admin-seed { font-size: 20px; width: 28px; color: var(--accent, #ff2737); }
.admin-application dl { display: flex; flex-wrap: wrap; gap: 24px; }
.admin-application dt { font-size: 13px; color: #555; }
.admin-application dd { margin: 6px 0 0; overflow-wrap: anywhere; }
@media(max-width: 700px) {
 .admin-conflict { padding: 16px; }.admin-conflict-values { grid-template-columns: 1fr; }
 .admin-header { align-items: flex-start; }.admin-brand { font-size: 20px; }.admin-header .admin-row-actions { font-size: 13px; }
 .admin-overview { grid-template-columns: 1fr 1fr; }.admin-overview strong { font-size: 20px; }
 .admin-tabs { display: grid; grid-template-columns: repeat(3, 1fr); }.admin-tabs button { padding: 14px 5px; font-size: 14px; border: 1px solid #000; }
 .admin-save-bar { flex-direction: column; align-items: stretch; gap: 12px; padding: 14px; }.admin-save-bar .admin-row-actions { justify-content: space-between; gap: 8px; }.admin-save-bar .pill-button { padding: 10px 14px; }
 .admin-team-list li { flex-wrap: wrap; }.admin-team-list .admin-row-actions { margin-left: 44px; }
 .admin-add-team { align-items: stretch; flex-direction: column; }.admin-login { padding: 20px; }
}
</style>
