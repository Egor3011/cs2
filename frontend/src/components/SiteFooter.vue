<script setup>
defineProps({ streamUrl: { type: String, default: '' } })
defineEmits(['register'])
</script>

<template>
  <footer class="site-footer site-width">
    <h2>Полезные ссылки</h2>
    <p v-if="streamUrl"><a :href="streamUrl" target="_blank" rel="noopener noreferrer">Трансляция</a></p>
    <p><RouterLink to="/#registration" @click="$emit('register')">Регистрация команды</RouterLink></p>
    <p><RouterLink to="/#prizes">Взнос и призовые</RouterLink></p>
    <p><a href="/documents/tournament-regulations.txt" target="_blank" rel="noopener">Регламент турнира</a></p>
    <p><a href="/documents/participant-agreement.txt" target="_blank" rel="noopener">Согласие участника</a></p>
    <p><a href="/documents/reglament_obrabotki_personalnyh_dannyh.pdf" target="_blank" rel="noopener">Правила обработки данных</a></p>
    <small>© 2026 CS2 Command</small>
  </footer>
</template>
