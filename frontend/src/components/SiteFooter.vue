<script setup>
import { safeExternalUrl } from '@/data/siteContent'
defineProps({ streamUrl: { type: String, default: '' }, organizerUrl: { type: String, default: 'https://t.me/zavoz_contenta' }, organizerLabel: { type: String, default: 'ТГ организатора: @zavoz_contenta' } })
defineEmits(['register'])
</script>

<template>
  <footer class="site-footer site-width">
    <h2>Полезные ссылки</h2>
    <p><RouterLink to="/#registration" @click="$emit('register')">Регистрация команды</RouterLink></p>
    <p><RouterLink to="/#prizes">Взнос и призовые</RouterLink></p>
    <p><a href="/documents/tournament-regulations.txt" target="_blank" rel="noopener">Регламент турнира</a></p>
    <p><a href="/documents/participant-agreement.txt" target="_blank" rel="noopener">Согласие участника</a></p>
    <p><a href="/documents/reglament_obrabotki_personalnyh_dannyh.pdf" target="_blank" rel="noopener">Правила обработки данных</a></p>
    <p v-if="safeExternalUrl(organizerUrl)"><a :href="safeExternalUrl(organizerUrl)" target="_blank" rel="noopener">{{ organizerLabel }}</a></p>
    <small>© 2026 CS2 Command</small>
  </footer>
</template>
