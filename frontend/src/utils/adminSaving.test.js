import assert from 'node:assert/strict'
import test from 'node:test'
import { readTournamentVersion, mergeTournamentDraft } from './adminSaving.js'

test('version reads remain stable through gzip ETag changes and older backends', () => {
  assert.equal(readTournamentVersion({ 'x-tournament-version': '"new"', etag: 'W/"proxy"' }), '"new"')
  assert.equal(readTournamentVersion({ etag: 'W/"old"' }), '"old"')
  assert.equal(readTournamentVersion({ etag: ' "old" ' }), '"old"')
  assert.equal(readTournamentVersion({}), '')
})
test('independent edits merge without losing either side or mutating inputs', () => {
  const base = { title: 'Cup', terms: { entryFee: 2000 }, matches: { final: { status: 'scheduled', scores: [0, 0] } } }
  const local = { ...base, title: 'New Cup' }
  const remote = { ...base, matches: { final: { status: 'live', scores: [1, 0] } } }
  const before = JSON.stringify([base, local, remote])
  const merged = mergeTournamentDraft(base, local, remote)
  assert.deepEqual(merged.conflicts, [])
  assert.equal(merged.data.title, 'New Cup')
  assert.deepEqual(merged.data.matches.final.scores, [1, 0])
  assert.equal(JSON.stringify([base, local, remote]), before)
})
test('same-field edits require an explicit choice and keep unrelated changes', () => {
  const base = { title: 'Cup', terms: { entryFee: 2000, minimumTeams: 8 } }
  const local = { ...base, title: 'Mine', terms: { ...base.terms, minimumTeams: 16 } }
  const remote = { ...base, title: 'Theirs', terms: { ...base.terms, entryFee: 3000 } }
  const mine = mergeTournamentDraft(base, local, remote)
  assert.deepEqual(mine.conflicts, [{ path: ['title'], local: 'Mine', remote: 'Theirs' }])
  assert.deepEqual(mine.data, { title: 'Mine', terms: { entryFee: 3000, minimumTeams: 16 } })
  const theirs = mergeTournamentDraft(base, local, remote, 'remote')
  assert.deepEqual(theirs.data, { title: 'Theirs', terms: { entryFee: 3000, minimumTeams: 16 } })
})
test('matching simultaneous edits need no confirmation; key order is irrelevant', () => {
  const merged = mergeTournamentDraft({ title: 'Old', terms: { a: 1, b: 2 } }, { title: 'New', terms: { a: 1, b: 2 } }, { terms: { b: 2, a: 1 }, title: 'New' })
  assert.deepEqual(merged.conflicts, [])
  assert.equal(merged.data.title, 'New')
})
test('array order, deletion/edit collisions, independent additions and nulls survive merging', () => {
  const base = { teams: [{ id: 'a' }, { id: 'b' }], matches: { a: { stage: 'A' } }, stream: null }
  const local = { teams: [...base.teams].reverse(), matches: {}, stream: null }
  const remote = { teams: [...base.teams, { id: 'c' }], matches: { a: { stage: 'New A' }, b: { stage: 'B' } }, stream: { url: 'https://twitch.tv/example' } }
  const result = mergeTournamentDraft(base, local, remote)
  assert.deepEqual(result.conflicts.map(field => field.path), [['teams'], ['matches', 'a']])
  assert.deepEqual(result.data.matches, { b: { stage: 'B' } })
  assert.deepEqual(result.data.teams, [{ id: 'b' }, { id: 'a' }])
  assert.equal(result.data.stream.url, 'https://twitch.tv/example')
})
