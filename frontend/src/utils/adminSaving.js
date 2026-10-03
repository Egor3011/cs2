import { clone } from './adminTournament.js'

export function readTournamentVersion(headers) {
  const value = headers?.['x-tournament-version'] || headers?.etag || ''
  return value.trim().replace(/^W\/\s*/, '')
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const same = (left, right) => {
  if (left === right) return true
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, index) => same(value, right[index]))
  if (object(left) && object(right)) {
    const keys = Object.keys(left)
    return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && same(left[key], right[key]))
  }
  return false
}
const copy = value => value === undefined ? undefined : clone(value)

// A three-way merge keeps independent server edits and every local edit.
// Arrays (teams/seed order, scores, FAQ) remain atomic to avoid inventing a new order.
export function mergeTournamentDraft(base, local, remote, preference = 'local') {
  const conflicts = []
  function merge(before, mine, theirs, path) {
    if (same(mine, before)) return copy(theirs)
    if (same(theirs, before) || same(mine, theirs)) return copy(mine)
    if (object(before) && object(mine) && object(theirs)) {
      const merged = {}
      const keys = new Set([...Object.keys(before), ...Object.keys(mine), ...Object.keys(theirs)])
      for (const key of keys) {
        const value = merge(before[key], mine[key], theirs[key], [...path, key])
        if (value !== undefined) merged[key] = value
      }
      return merged
    }
    conflicts.push({ path, local: copy(mine), remote: copy(theirs) })
    return copy(preference === 'remote' ? theirs : mine)
  }
  return { data: merge(base, local, remote, []), conflicts }
}

const fields = {
  title: 'Название турнира', teams: 'Команды и посев', results: 'Результаты сетки', resetFinal: 'Повторный финал',
  startsOn: 'Дата начала', endsOn: 'Дата окончания', registrationClosesAt: 'Срок регистрации', entryFee: 'Вступительный взнос', minimumTeams: 'Минимум команд',
  first: 'Доля 1 места', second: 'Доля 2 места', third: 'Доля 3 места', organization: 'Доля организатора',
  heroLead: 'Заголовок главной', heroDescription: 'Описание турнира', preflightText: 'Напоминание перед матчем', broadcastText: 'Информация об эфире',
  organizerUrl: 'Ссылка организатора', organizerLabel: 'Подпись организатора', participationSteps: 'Шаги участия', participationCards: 'Условия участия', faqItems: 'Вопросы и ответы',
  stage: 'Стадия матча', status: 'Статус матча', scores: 'Счёт', startsAt: 'Время матча', maps: 'Карты', players: 'Статистика игроков', team1Id: 'Первая команда', team2Id: 'Вторая команда', bestOf: 'Формат матча',
}
export function conflictLabel(path, data) {
  const label = fields[path.at(-1)] ?? path.at(-1)
  if (path[0] === 'matches') return `${data.matches?.[path[1]]?.stage ?? 'Матч'}: ${label}`
  if (path[0] === 'results') return `Результат сетки ${path[1]}`
  if (path[0] === 'stream') return `Трансляция: ${label === 'url' ? 'ссылка' : label}`
  return label
}
export function conflictValue(value) {
  if (value === undefined) return 'Удалено'
  if (value === null || value === '') return 'Не задано'
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
}
