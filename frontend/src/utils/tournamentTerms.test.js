import test from 'node:test'
import assert from 'node:assert/strict'
import { registrationCountdown, contributionBreakdown, formatRubles } from './tournamentTerms.js'

const deadline = '2026-10-08T12:00:00+03:00'
const distribution = { first: 50, second: 25, third: 15, organization: 10 }

test('registration deadline is 09:00 UTC, independent of device timezone', () => {
  assert.deepEqual(registrationCountdown(deadline, Date.parse('2026-10-07T08:00:00Z')), { closed: false, days: 1, hours: 1, minutes: 0, seconds: 0 })
  assert.deepEqual(registrationCountdown(deadline, Date.parse('2026-10-08T08:59:59.500Z')), { closed: false, days: 0, hours: 0, minutes: 0, seconds: 1 })
})

test('registration closes exactly at the deadline, without a negative counter', () => {
  for (const time of ['2026-10-08T09:00:00Z', '2026-10-09T09:00:00Z']) {
    assert.deepEqual(registrationCountdown(deadline, Date.parse(time)), { closed: true, days: 0, hours: 0, minutes: 0, seconds: 0 })
  }
  assert.equal(registrationCountdown('invalid').closed, true)
})

test('prize percentages use all entry fees, including the organizer share', () => {
  assert.deepEqual(contributionBreakdown(8, 2000, distribution), { total: 16000, payouts: { first: 8000, second: 4000, third: 2400, organization: 1600 } })
  for (const count of [9, 32, 257, 1000]) {
    const { total, payouts } = contributionBreakdown(count, 2000, distribution)
    assert.equal(Object.values(payouts).reduce((sum, value) => sum + value, 0), total)
    assert.equal(payouts.first + payouts.second + payouts.third, total * .9)
  }
  assert.equal(contributionBreakdown(8.5, 2000, distribution), null)
  assert.equal(contributionBreakdown(0, 2000, distribution), null)
  assert.equal(formatRubles(2000), '2.000 ₽')
})
