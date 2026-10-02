<script setup>
import StreamPlayer from './StreamPlayer.vue'

defineProps({
  channel: { type: String, default: null },
  href: { type: String, default: null },
  team1: { type: String, default: 'Команда 1' },
  team2: { type: String, default: 'Команда 2' },
  score1: { type: [Number, String], default: null },
  score2: { type: [Number, String], default: null },
  format: { type: String, default: '' },
  live: { type: Boolean, default: true },
})
</script>

<template>
  <section class="live-stream" aria-labelledby="live-stream-title">
    <header class="live-stream__header">
      <div>
        <span class="live-stream__eyebrow" :class="{ 'live-stream__eyebrow--live': live }"><i v-if="live" aria-hidden="true"></i>{{ live ? 'В ЭФИРЕ / ПРЯМАЯ ТРАНСЛЯЦИЯ' : 'ТРАНСЛЯЦИЯ' }}</span>
        <h2 id="live-stream-title">{{ team1 }} <b>{{ score1 ?? '—' }} : {{ score2 ?? '—' }}</b> {{ team2 }}</h2>
      </div>
      <span v-if="format" class="live-stream__format">{{ format }}</span>
    </header>
    <div class="live-stream__frame">
      <aside class="live-stream__pattern live-stream__pattern--left" aria-hidden="true"><span>CS2<br>LIVE<br>FEED</span></aside>
      <div class="live-stream__video">
        <StreamPlayer v-if="channel" :channel="channel" />
        <div v-else class="live-stream__fallback">
          <span>Трансляция доступна по ссылке организатора</span>
          <a v-if="href" :href="href" target="_blank" rel="noopener noreferrer">Открыть трансляцию ↗</a>
        </div>
      </div>
      <aside class="live-stream__pattern live-stream__pattern--right" aria-hidden="true"><span>COMMAND<br>CUP<br>2026</span></aside>
    </div>
  </section>
</template>

<style scoped>
.live-stream { margin-bottom: 30px; color: #000; background: #fff; }
.live-stream__header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 20px; }
.live-stream__eyebrow { display: inline-flex; align-items: center; gap: 9px; font-size: 16px; }
.live-stream__eyebrow--live { color: var(--accent); }
.live-stream__eyebrow i { width: 7px; height: 7px; flex-shrink: 0; border-radius: 50%; background: currentColor; animation: live-pulse 2.2s ease-in-out infinite; }
.live-stream h2 { margin-top: 14px; font-size: 24px; }
.live-stream h2 b { margin-inline: .18em; }
.live-stream__format { font-size: 16px; }
.live-stream__frame { border: 1px solid #000; }
.live-stream__video { aspect-ratio: 16 / 9; background: #000; }
.live-stream__video :deep(.stream-player) { height: 100%; }
.live-stream__pattern { display: none; }
.live-stream__fallback { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; height: 100%; padding: 24px; color: #fff; text-align: center; }
@media (max-width: 700px) {
  .live-stream__header { align-items: flex-start; flex-direction: column; gap: 12px; }
  .live-stream h2 { font-size: 20px; }
}
</style>
