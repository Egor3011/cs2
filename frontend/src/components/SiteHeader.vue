<script setup>
defineProps({ registrationClosed: { type: Boolean, default: false } })
defineEmits(['register'])
</script>

<template>
  <header class="site-header site-width">
    <a class="skip-link" href="#main-content">К содержимому</a>
    <RouterLink class="site-brand" to="/" aria-label="CS2 Command — главная">
      <span class="site-brand__name">CS2 Weekly</span>
      <span class="site-brand__subtitle">Турниры по Counter-Strike 2</span>
    </RouterLink>
    <nav class="site-nav" aria-label="Основная навигация">
      <RouterLink to="/#prizes">Призовые</RouterLink>
      <RouterLink to="/#faq">Вопросы</RouterLink>
      <RouterLink class="site-nav__apply" to="/#registration" @click="$emit('register')">{{ registrationClosed ? 'Регистрация' : 'Подать заявку' }} <span aria-hidden="true">↗</span></RouterLink>
    </nav>
  </header>
</template>
