import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareTournament, clone, setBracketResult, syncLinkedMatches, validateTournament, moscowInput, moscowIso } from './adminTournament.js'
import { safeExternalUrl } from '../data/siteContent.js'
const sample = () => prepareTournament({ title: 'Cup', resetFinal: false, teams: ['a', 'b', 'c', 'd'].map((id, index) => ({ id, name: id.toUpperCase(), seed: index + 1 })), matches: {}, results: {} })

test('Moscow date fields retain the timezone and optional times', () => {
  assert.equal(moscowInput('2026-10-08T09:00:00Z'), '2026-10-08T12:00')
  assert.equal(moscowIso('2026-10-08T12:00'), '2026-10-08T12:00:00+03:00')
  assert.equal(moscowInput(null), '')
  assert.equal(moscowIso(''), null)
})
test('changing an earlier winner clears dependent results, including the same later winner against a different opponent', () => {
  const draft = sample()
  setBracketResult(draft, 'WB1-1', { winnerId: 'a', scores: [2, 0] })
  setBracketResult(draft, 'WB1-2', { winnerId: 'b', scores: [2, 0] })
  setBracketResult(draft, 'WB2-1', { winnerId: 'a', scores: [2, 0] })
  setBracketResult(draft, 'LB1-1', { winnerId: 'c', scores: [0, 2] })
  setBracketResult(draft, 'WB1-1', { winnerId: 'd', scores: [0, 2] })
  assert.deepEqual(Object.keys(draft.results).sort(), ['WB1-1', 'WB1-2'])
  assert.equal(draft.results['WB1-2'].winnerId, 'b')
})
test('score corrections retain compatible later results; invalid results do not mutate the draft', () => {
  const draft = sample()
  setBracketResult(draft, 'WB1-1', { winnerId: 'a', scores: [2, 0] })
  setBracketResult(draft, 'WB1-2', { winnerId: 'b', scores: [2, 0] })
  setBracketResult(draft, 'WB2-1', { winnerId: 'a', scores: [2, 0] })
  setBracketResult(draft, 'WB1-1', { winnerId: 'a', scores: [2, 1] })
  assert.equal(draft.results['WB2-1'].winnerId, 'a')
  const before = clone(draft)
  assert.throws(() => setBracketResult(draft, 'WB1-1', { winnerId: 'd', scores: [2, 0] }), /победителю/)
  assert.deepEqual(draft, before)
  setBracketResult(draft, 'WB1-1', { status: 'live', scores: [1, 1] })
  assert.equal(draft.results['WB2-1'], undefined)
})
test('linked match pages follow bracket participants, score and status, and hide when a prerequisite result is reset', () => {
  const draft = sample()
  setBracketResult(draft, 'WB1-1', { winnerId: 'a', scores: [2, 0] })
  setBracketResult(draft, 'WB1-2', { winnerId: 'b', scores: [2, 0] })
  draft.matches.final = { bracketId: 'WB2-1', team1Id: 'a', team2Id: 'b', status: 'scheduled', bestOf: 3, stage: 'Final', maps: [], players: [] }
  setBracketResult(draft, 'WB2-1', { status: 'live', scores: [1, 0] })
  assert.deepEqual(draft.matches.final.scores, [1, 0])
  assert.equal(draft.matches.final.status, 'live')
  setBracketResult(draft, 'WB1-1', null)
  assert.equal(draft.matches.final.hidden, true)
  assert.equal(draft.matches.final.bracketId, 'WB2-1')
  setBracketResult(draft, 'WB1-1', { winnerId: 'd', scores: [0, 2] })
  syncLinkedMatches(draft)
  assert.equal(draft.matches.final.hidden, false)
  assert.equal(draft.matches.final.team1Id, 'd')
  assert.equal(draft.matches.final.status, 'scheduled')
})
test('settings validation rejects inconsistent payouts, dates and participants; preparing a draft preserves unrelated data', () => {
  const input = { ...sample(), custom: { preserved: true } }
  const draft = prepareTournament(input)
  draft.content.heroLead = 'New text'
  assert.notEqual(input.content.heroLead, draft.content.heroLead)
  assert.deepEqual(draft.custom, { preserved: true })
  validateTournament(draft)
  draft.terms.prizeDistribution.organization = 11
  assert.throws(() => validateTournament(draft), /100%/)
  draft.terms.prizeDistribution.organization = 10
  draft.terms.endsOn = '2026-01-01'
  assert.throws(() => validateTournament(draft), /даты/)
  assert.equal(safeExternalUrl('javascript:alert(1)'), '')
  assert.equal(safeExternalUrl('https://t.me/organizer'), 'https://t.me/organizer')
})
