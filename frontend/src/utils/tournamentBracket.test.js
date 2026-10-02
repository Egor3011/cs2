import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildTournamentBracket as build } from './tournamentBracket.js'

const teams = (count) => Array.from({ length: count }, (_, i) => ({ id: `t${i + 1}`, name: `Team ${i + 1}` }))

function finish(count, { resetFinal = true, lowerWins = false, randomSeed = 1 } = {}) {
  const data = { teams: teams(count), results: {}, resetFinal }
  let bracket = build(data)
  let seed = randomSeed
  while (!bracket.champion) {
    const match = bracket.matches.find((item) => item.status === 'ready')
    assert.ok(match, `Tournament with ${count} teams is stuck`)
    assert.notEqual(match.slots[0].team.id, match.slots[1].team.id)
    seed = (seed * 1664525 + 1013904223) >>> 0
    const winnerIndex = match.id === 'GF1' ? Number(lowerWins) : (seed >>> 16) % 2
    data.results[match.id] = { winnerId: match.slots[winnerIndex].team.id, scores: winnerIndex ? [0, 2] : [2, 0] }
    bracket = build(data)
  }
  const losses = new Map(data.teams.map((team) => [team.id, 0]))
  for (const match of bracket.matches.filter((item) => item.status === 'completed')) {
    losses.set(match.loser.id, losses.get(match.loser.id) + 1)
  }
  if (resetFinal) {
    for (const [id, lost] of losses) assert.equal(lost, id === bracket.champion.id ? Number(lowerWins) : 2, `${id}, ${count} teams`)
  }
  assert.equal(bracket.completedCount, 2 * count - 2 + Number(resetFinal && lowerWins))
  return { data, bracket }
}

test('10 teams: six top seeds advance, two actual first-round matches', () => {
  const bracket = build({ teams: teams(10) })
  assert.equal(bracket.size, 16)
  assert.equal(bracket.byeCount, 6)
  const first = bracket.rounds.upper[0].matches
  assert.deepEqual(first.filter((m) => m.status === 'bye').map((m) => m.winner.seed).sort(), [1, 2, 3, 4, 5, 6])
  assert.equal(first.filter((m) => m.status === 'ready').length, 2)
  assert.deepEqual(first.filter((m) => m.status === 'ready').map((m) => m.slots.map((s) => s.team.seed)), [[8, 9], [7, 10]])
  assert.equal(bracket.rounds.upper[1].matches[0].status, 'pending')
  assert.equal(first.filter((m) => m.status === 'bye').some((m) => m.loser), false)
})

test('lower bracket distinguishes absent losers from unresolved losers', () => {
  const data = { teams: teams(10), results: { 'WB1-2': { winnerId: 't8' } } }
  const bracket = build(data)
  const auto = bracket.rounds.lower[0].matches[0]
  assert.equal(auto.status, 'bye')
  assert.equal(auto.winner.id, 't9')
  const next = bracket.rounds.lower[1].matches[0]
  assert.equal(next.status, 'pending')
  assert.equal(next.winner, null)
})

test('completed tournaments preserve two-loss elimination for 2–64, 100, 128, 255, 256 teams', () => {
  for (const count of [...Array.from({ length: 63 }, (_, i) => i + 2), 100, 128, 255, 256]) {
    for (const lowerWins of [false, true]) finish(count, { lowerWins, randomSeed: count * 101 })
  }
})

test('grand final reset is conditional, required only after a lower-bracket victory', () => {
  const upper = finish(4)
  assert.equal(upper.bracket.rounds.finals.length, 1)
  const lower = finish(4, { lowerWins: true })
  assert.equal(lower.bracket.rounds.finals.length, 2)
  delete lower.data.results.GF2
  const pending = build(lower.data)
  assert.equal(pending.champion, null)
  assert.equal(pending.rounds.finals[1].matches[0].status, 'ready')
  assert.equal(build({ teams: teams(4) }).rounds.finals[1].matches[0].status, 'conditional')
  assert.equal(finish(10, { resetFinal: false, lowerWins: true }).bracket.rounds.finals.length, 1)
})

test('live scores do not advance teams', () => {
  const bracket = build({ teams: teams(2), results: { 'WB1-1': { status: 'live', scores: [2, 0] } } })
  assert.equal(bracket.matches[0].winner, null)
  assert.equal(bracket.rounds.finals[0].matches[0].status, 'pending')
})

test('empty, one-team, string JSON, input immutability and sample', () => {
  assert.equal(build({ teams: [] }).matches.length, 0)
  assert.equal(build({ teams: teams(1) }).champion.id, 't1')
  const data = { teams: teams(10) }
  const before = JSON.stringify(data)
  assert.deepEqual(build(before), build(data))
  assert.equal(JSON.stringify(data), before)
  const sample = readFileSync(new URL('../data/tournament.example.json', import.meta.url), 'utf8')
  const sampleData = JSON.parse(sample)
  const completedResults = Object.values(sampleData.results ?? {}).filter((result) => result.winnerId).length
  assert.equal(build(sample).completedCount, completedResults)
})

test('invalid JSON, teams, seeds, scores and results report useful errors', () => {
  assert.throws(() => build('{'), /JSON/)
  assert.throws(() => build({}), /teams/)
  assert.throws(() => build({ teams: [{ id: 'a', name: '' }] }), /name/)
  assert.throws(() => build({ teams: [teams(1)[0], teams(1)[0]] }), /id/)
  assert.throws(() => build({ teams: teams(2).map((team) => ({ ...team, seed: 1 })) }), /seed/)
  assert.throws(() => build({ teams: teams(2), results: [] }), /results/)
  assert.throws(() => build({ teams: teams(2), results: { nope: {} } }), /Неизвестный/)
  for (const result of [{ winnerId: 'nope' }, { winnerId: 't1', scores: [0, 2] }, { winnerId: 't1', scores: [2, 2] }, { winnerId: 't1', scores: [-1, 0] }, { status: 'live', winnerId: 't1' }]) {
    assert.throws(() => build({ teams: teams(2), results: { 'WB1-1': result } }), /WB1-1/)
  }
  assert.throws(() => build({ teams: teams(3), results: { 'WB1-1': { winnerId: 't1' } } }), /двумя/)
  assert.throws(() => build({ teams: teams(4), results: { 'WB2-1': { winnerId: 't1' } } }), /двумя/)
})

test('brackets accept more than 256 teams without a registration cap', () => {
  for (const count of [257, 512, 1000]) {
    const bracket = build({ teams: teams(count), resetFinal: false })
    assert.equal(bracket.teams.length, count)
    const firstRound = bracket.rounds.upper[0].matches
    const seeded = firstRound.flatMap(match => match.slots.filter(slot => slot.team).map(slot => slot.team.id))
    assert.equal(new Set(seeded).size, count)
    assert.equal(bracket.byeCount, bracket.size - count)
    assert.equal(bracket.rounds.finals.length, 1)
  }
})
