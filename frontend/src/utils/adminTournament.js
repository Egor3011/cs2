import defaultTerms from '../data/tournamentTerms.json' with { type: 'json' }
import { siteContent, safeExternalUrl } from '../data/siteContent.js'
import { buildTournamentBracket } from './tournamentBracket.js'
import { twitchChannelFromUrl } from './stream.js'

export const clone = value => JSON.parse(JSON.stringify(value))
export function prepareTournament(data) {
  const draft = clone(data)
  draft.terms = { ...clone(defaultTerms), ...draft.terms, prizeDistribution: { ...defaultTerms.prizeDistribution, ...draft.terms?.prizeDistribution } }
  draft.content = siteContent(draft.content)
  draft.teams.sort((a, b) => a.seed - b.seed)
  draft.matches ??= {}; draft.results ??= {}; draft.stream ??= { url: '' }
  return draft
}
export function moscowInput(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return ''
  return new Date(Date.parse(value) + 3 * 3600000).toISOString().slice(0, 16)
}
export function moscowIso(value) { return value ? `${value}:00+03:00` : null }
export function renumberTeams(teams) { teams.forEach((team, index) => { team.seed = index + 1 }) }

// Replay results in match order, keeping only those valid for the new participants.
export function reconcileResults(data) {
  const old = data.results ?? {}
  const candidate = { ...data, results: {} }
  const order = buildTournamentBracket(candidate).matches.map(match => match.id)
  for (const id of order) {
    if (!old[id]) continue
    candidate.results[id] = old[id]
    try { buildTournamentBracket(candidate) } catch { delete candidate.results[id] }
  }
  return candidate.results
}
export function setBracketResult(data, id, result) {
  const bracket = buildTournamentBracket(data)
  const match = bracket.matches.find(match => match.id === id)
  if (!match || match.slots.some(slot => !slot.team)) throw new Error('Сначала определите участников этого матча.')
  if (result?.status !== 'live' && result && (!match.slots.some(slot => slot.team.id === result.winnerId) || !result.scores || result.scores[match.slots.findIndex(slot => slot.team.id === result.winnerId)] <= result.scores[match.slots.findIndex(slot => slot.team.id !== result.winnerId)])) throw new Error('Счёт должен соответствовать выбранному победителю.')
  if (result?.scores?.some(score => !Number.isInteger(score) || score < 0)) throw new Error('Счёт — целое неотрицательное число.')
  const proposed = clone(data)
  if (result) proposed.results[id] = result; else delete proposed.results[id]
  if ((match.winner?.id ?? null) !== (result?.winnerId ?? null)) {
    const descendants = new Set()
    const visit = current => { for (const next of current.destinations) { if (!descendants.has(next.matchId)) { descendants.add(next.matchId); visit(bracket.matches.find(item => item.id === next.matchId)) } } }
    visit(match)
    for (const descendant of descendants) delete proposed.results[descendant]
  }
  proposed.results = reconcileResults(proposed)
  if (result && !proposed.results[id]) throw new Error('Этот результат нельзя применить к текущей сетке.')
  data.results = proposed.results
  syncLinkedMatches(data)
}
export function syncLinkedMatches(data) {
  const bracket = buildTournamentBracket(data)
  for (const detail of Object.values(data.matches)) {
    if (!detail.bracketId) continue
    const match = bracket.matches.find(match => match.id === detail.bracketId)
    if (!match || match.slots.some(slot => !slot.team)) {
      // Retain the link, but do not publish a pairing whose participants are unknown.
      detail.hidden = true
      detail.status = 'scheduled'; delete detail.scores
      detail.maps = []; detail.players = []; delete detail.currentRound; delete detail.totalRounds
      continue
    }
    detail.hidden = false
    const [first, second] = match.slots.map(slot => slot.team.id)
    const participantsChanged = first !== detail.team1Id || second !== detail.team2Id
    detail.team1Id = first; detail.team2Id = second
    detail.status = ['completed', 'live'].includes(match.status) ? match.status : 'scheduled'
    if (match.scores) detail.scores = [...match.scores]; else delete detail.scores
    if (participantsChanged) { detail.maps = []; detail.players = []; delete detail.currentRound; delete detail.totalRounds }
  }
  const live = Object.values(data.matches).find(match => match.status === 'live' && !match.hidden)
  if (live) {
    data.stream.team1 = data.teams.find(team => team.id === live.team1Id)?.name
    data.stream.team2 = data.teams.find(team => team.id === live.team2Id)?.name
    data.stream.score1 = live.scores?.[0]; data.stream.score2 = live.scores?.[1]
    data.stream.format = `LIVE · BO${live.bestOf}`
  } else {
    delete data.stream.team1; delete data.stream.team2; delete data.stream.score1; delete data.stream.score2
    data.stream.format = ''
  }
}
export function validateTournament(data) {
  if (!data.title?.trim()) throw new Error('Укажите название турнира.')
  if (data.stream.url && !twitchChannelFromUrl(data.stream.url)) throw new Error('Укажите ссылку на канал Twitch в разделе «Турнир».')
  const terms = data.terms
  if (!terms.startsOn || !terms.endsOn || terms.endsOn < terms.startsOn) throw new Error('Проверьте даты турнира.')
  if (!Number.isFinite(Date.parse(terms.registrationClosesAt))) throw new Error('Укажите срок регистрации.')
  if (moscowInput(terms.registrationClosesAt).slice(0, 10) > terms.startsOn) throw new Error('Регистрация должна завершиться до начала турнира.')
  if (!Number.isInteger(terms.entryFee) || terms.entryFee < 0 || !Number.isInteger(terms.minimumTeams) || terms.minimumTeams < 2) throw new Error('Проверьте взнос и минимальное количество команд.')
  const shares = Object.values(terms.prizeDistribution)
  if (shares.some(share => !Number.isInteger(share) || share < 0 || share > 100) || shares.reduce((sum, share) => sum + share, 0) !== 100) throw new Error('Сумма долей призёров и организатора должна быть 100%.')
  if (!data.teams.length) throw new Error('Добавьте хотя бы одну команду для подготовки сетки.')
  for (const item of [...data.content.participationSteps, ...data.content.participationCards]) {
    if (!item.title?.trim() || !item.text?.trim()) throw new Error('Заполните заголовки и описания в разделе «Тексты».')
  }
  for (const faq of data.content.faqItems) {
    if (!faq.question?.trim() || !faq.answer?.length || faq.answer.some(text => !text.trim())) throw new Error('Заполните все вопросы и ответы в разделе «Тексты».')
  }
  buildTournamentBracket(data)
  const ids = new Set(data.teams.map(team => team.id))
  for (const [id, match] of Object.entries(data.matches)) {
    if (!match.stage?.trim()) throw new Error(`Укажите название матча ${id}.`)
    if (!ids.has(match.team1Id) || !ids.has(match.team2Id) || match.team1Id === match.team2Id) throw new Error(`В матче «${match.stage}» выберите две разные команды.`)
    if (!Number.isInteger(match.bestOf) || match.bestOf < 1 || match.bestOf > 9) throw new Error(`Проверьте формат матча «${match.stage}».`)
    if (match.scores && match.scores.some(score => !Number.isInteger(score) || score < 0)) throw new Error(`Проверьте счёт матча «${match.stage}».`)
    if ((match.maps?.length ?? 0) > match.bestOf) throw new Error(`В матче «${match.stage}» больше карт, чем допускает формат.`)
    for (const map of match.maps ?? []) {
      if (!map.name?.trim()) throw new Error(`Укажите названия карт в матче «${match.stage}».`)
      if (map.status !== 'scheduled' && (!map.scores || map.scores.some(score => !Number.isInteger(score) || score < 0))) throw new Error(`Проверьте счёт карты «${map.name}».`)
    }
    for (const player of match.players ?? []) {
      if (!player.name?.trim() || ['kills', 'deaths', 'adr', 'kast', 'rating'].some(field => !Number.isFinite(player[field]) || player[field] < 0) || !Number.isInteger(player.kills) || !Number.isInteger(player.deaths) || player.kast > 100) throw new Error(`Проверьте имя и статистику игроков в матче «${match.stage}».`)
    }
    if (match.players?.some(player => ![match.team1Id, match.team2Id].includes(player.teamId))) throw new Error(`Проверьте команды игроков в матче «${match.stage}».`)
    if (match.broadcast?.url && !safeExternalUrl(match.broadcast.url)) throw new Error(`Проверьте ссылку трансляции матча «${match.stage}».`)
  }
  if (data.content.organizerUrl && !safeExternalUrl(data.content.organizerUrl)) throw new Error('Ссылка организатора должна начинаться с https:// или http://.')
  return data
}
