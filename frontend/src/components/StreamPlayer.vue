<template>
  <div class="stream-player">
    <iframe
      :src="twitchUrl"
      :title="`Трансляция Twitch: ${channel}`"
      frameborder="0"
      scrolling="no"
      allowfullscreen
      allow="autoplay; fullscreen"
      class="stream-player__iframe"
    ></iframe>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  channel: {
    type: String,
    default: 'vanfantv'
  }
})

const parent = window.location.hostname

const twitchUrl = computed(() => {
  return `https://player.twitch.tv/?channel=${props.channel}&parent=${parent}&autoplay=false`
})
</script>

<style scoped>
.stream-player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
}

.stream-player__iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>