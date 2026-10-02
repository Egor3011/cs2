const settled = new Set(['completed', 'bye', 'empty'])
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

function seedOrder(size) {
  let seeds = [1]
  while (seeds.length < size) {
    const nextSize = seeds.length * 2
    seeds = seeds.flatMap((seed) => [seed, nextSize + 1 - seed])
  }
  return seeds
}

/** Build a deterministic double-elimination bracket without mutating the input. */
export function buildTournamentBracket(input) {
  let data = input
  if (typeof input === 'string') {
    try { data = JSON.parse(input) } catch { throw new Error('Не удалось прочитать JSON турнира.') }
  }
  if (!data || !Array.isArray(data.teams)) throw new Error('Передайте объект с массивом teams.')
  if (data.resetFinal !== undefined && typeof data.resetFinal !== 'boolean') {
    throw new Error('resetFinal должен быть true или false.')
  }
  const ids = new Set()
  const seeds = new Set()
  const teams = data.teams.map((team, index) => {
    if (!team || typeof team.id !== 'string' || !team.id.trim() ||
        typeof team.name !== 'string' || !team.name.trim()) {
      throw new Error('У каждой команды должны быть непустые строки id и name.')
    }
    const seed = team.seed ?? index + 1
    if (!Number.isInteger(seed) || seed < 1 || seed > data.teams.length || seeds.has(seed)) {
      throw new Error('Посев seed должен быть уникальным числом от 1 до количества команд.')
    }
    if (ids.has(team.id)) throw new Error(`Повторяющийся id команды: ${team.id}.`)
    ids.add(team.id)
    seeds.add(seed)
    return { ...team, name: team.name.trim(), seed }
  }).sort((a, b) => a.seed - b.seed)

  const results = data.results ?? {}
  if (typeof results !== 'object' || Array.isArray(results)) throw new Error('results должен быть объектом.')
  const resetFinal = data.resetFinal !== false
  const size = teams.length < 2 ? teams.length : 2 ** Math.ceil(Math.log2(teams.length))
  const rounds = { upper: [], lower: [], finals: [] }
  const matches = []
  const byId = new Map()
  const source = (match, outcome = 'winner') => {
    const pending = !settled.has(match.status)
    return {
      team: pending ? null : match[outcome], pending,
      label: `${outcome === 'winner' ? 'Победитель' : 'Проигравший'} ${match.id}`,
      source: { matchId: match.id, outcome },
    }
  }
  const createMatch = (id, slots, bracket, round, conditional = false) => {
    const match = {
      id, slots, bracket, round, winner: null, loser: null, scores: null,
      status: conditional ? 'conditional' : 'pending', destinations: [],
    }
    const participants = slots.filter((slot) => slot.team).map((slot) => slot.team)
    if (!conditional && slots.every((slot) => !slot.pending)) {
      match.status = participants.length === 2 ? 'ready' : participants.length === 1 ? 'bye' : 'empty'
      if (participants.length === 1) match.winner = participants[0]
    }
    if (own(results, id)) {
      const result = results[id]
      const fail = (message) => { throw new Error(`${id}: ${message}`) }
      if (match.status !== 'ready') fail('результат можно задать только для матча с двумя известными командами.')
      if (!result || typeof result !== 'object' || Array.isArray(result)) fail('неверный формат результата.')
      if (result.status != null && !['live', 'completed'].includes(result.status)) fail('status должен быть live или completed.')
      if (result.scores !== undefined) {
        if (!Array.isArray(result.scores) || result.scores.length !== 2 ||
            !result.scores.every((score) => Number.isInteger(score) && score >= 0)) {
          fail('scores должен содержать два неотрицательных целых числа.')
        }
        match.scores = [...result.scores]
      }
      if (result.status === 'live') {
        if (result.winnerId !== undefined) fail('у текущего матча ещё нет winnerId.')
        match.status = 'live'
      } else {
        const winnerIndex = slots.findIndex((slot) => slot.team.id === result.winnerId)
        if (winnerIndex < 0) fail('winnerId должен совпадать с id участника матча.')
        if (match.scores && match.scores[winnerIndex] <= match.scores[1 - winnerIndex]) {
          fail('счёт должен соответствовать победителю и не может быть ничейным.')
        }
        match.status = 'completed'
        match.winner = slots[winnerIndex].team
        match.loser = slots[1 - winnerIndex].team
      }
    }
    matches.push(match)
    byId.set(id, match)
    return match
  }
  const addRound = (bracket, title, pairs) => {
    const number = rounds[bracket].length + 1
    const prefix = bracket === 'upper' ? 'WB' : 'LB'
    const roundMatches = pairs.map((slots, i) => createMatch(`${prefix}${number}-${i + 1}`, slots, bracket, number))
    rounds[bracket].push({ id: `${prefix}${number}`, title, matches: roundMatches })
    return roundMatches
  }

  let champion = teams.length === 1 ? teams[0] : null
  if (size >= 2) {
    const roundCount = Math.log2(size)
    const slots = seedOrder(size).map((seed) => ({ team: teams[seed - 1] ?? null, pending: false, label: 'Свободное место' }))
    let upper
    for (let r = 1; r <= roundCount; r++) {
      const entries = r === 1 ? slots : upper.map((match) => source(match))
      const pairs = Array.from({ length: entries.length / 2 }, (_, i) => entries.slice(i * 2, i * 2 + 2))
      const remaining = roundCount - r
      const title = remaining === 0 ? 'Финал верхней сетки' : remaining === 1 ? 'Полуфинал' : remaining === 2 ? 'Четвертьфинал' : `Раунд ${r}`
      upper = addRound('upper', title, pairs)
    }

    let lower
    if (size > 2) {
      const firstLosers = rounds.upper[0].matches.map((match) => source(match, 'loser'))
      lower = addRound('lower', 'Раунд 1', Array.from({ length: firstLosers.length / 2 }, (_, i) => firstLosers.slice(i * 2, i * 2 + 2)))
      for (let r = 2; r <= roundCount; r++) {
        // Cross upper-bracket drops to avoid immediate rematches in the opening rounds.
        const drops = [...rounds.upper[r - 1].matches].reverse()
        lower = addRound('lower', r === roundCount ? 'Финал нижней сетки' : `Раунд ${2 * r - 2}`,
          lower.map((match, i) => [source(match), source(drops[i], 'loser')]))
        if (r < roundCount) {
          lower = addRound('lower', `Раунд ${2 * r - 1}`,
            Array.from({ length: lower.length / 2 }, (_, i) => [source(lower[i * 2]), source(lower[i * 2 + 1])]))
        }
      }
    }
    const upperFinal = upper[0]
    const lowerWinner = lower ? source(lower[0]) : source(upperFinal, 'loser')
    const final = createMatch('GF1', [source(upperFinal), lowerWinner], 'finals', 1)
    rounds.finals.push({ id: 'GF1', title: 'Гранд-финал', matches: [final] })
    const lowerWon = final.status === 'completed' && final.winner.id === final.slots[1].team.id
    if (resetFinal && (final.status !== 'completed' || lowerWon)) {
      const reset = createMatch('GF2', [source(final), source(final, 'loser')], 'finals', 2, !lowerWon)
      rounds.finals.push({ id: 'GF2', title: 'Повторный финал', matches: [reset] })
      champion = reset.winner
    } else {
      champion = final.winner
    }
  }
  for (const id of Object.keys(results)) {
    if (!byId.has(id)) throw new Error(`Неизвестный или не требующийся матч: ${id}.`)
  }
  for (const match of matches) {
    for (const slot of match.slots) {
      if (slot.source) byId.get(slot.source.matchId).destinations.push({ matchId: match.id, outcome: slot.source.outcome })
    }
  }
  return {
    title: typeof data.title === 'string' ? data.title : 'Сетка турнира', teams, size,
    byeCount: size - teams.length, resetFinal, rounds, matches, champion,
    completedCount: matches.filter((match) => match.status === 'completed').length,
  }
}
