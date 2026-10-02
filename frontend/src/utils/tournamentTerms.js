export function registrationCountdown(deadline, now = Date.now()) {
  const closesAt = Date.parse(deadline)
  const closed = !Number.isFinite(closesAt) || now >= closesAt
  const remaining = closed ? 0 : Math.ceil((closesAt - now) / 1000)
  return {
    closed,
    days: Math.floor(remaining / 86400),
    hours: Math.floor(remaining % 86400 / 3600),
    minutes: Math.floor(remaining % 3600 / 60),
    seconds: remaining % 60,
  }
}

export function contributionBreakdown(teamCount, entryFee, distribution) {
  if (!Number.isSafeInteger(teamCount) || teamCount < 1) return null
  const total = teamCount * entryFee
  if (!Number.isSafeInteger(total)) return null
  return { total, payouts: Object.fromEntries(Object.entries(distribution).map(([place, percent]) => [place, total * percent / 100])) }
}

export function formatRubles(value) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value).replace(/[\u00a0\u202f ]/g, '.')} ₽`
}
