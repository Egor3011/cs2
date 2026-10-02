export function twitchChannelFromUrl(url) {
  if (typeof url !== 'string') return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || !['twitch.tv', 'www.twitch.tv'].includes(parsed.hostname.toLowerCase())) return null
    const channel = parsed.pathname.split('/').filter(Boolean)[0]
    return /^[a-z0-9_]+$/i.test(channel) ? channel : null
  } catch {
    return null
  }
}
