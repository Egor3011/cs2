<script setup>
import { moscowInput, moscowIso } from '@/utils/adminTournament'
defineProps({ draft: { type: Object, required: true } })
const shareLabels = { first: '1 место', second: '2 место', third: '3 место', organization: 'Организация' }
</script>
<template>
  <section aria-labelledby="admin-settings-title">
    <h2 id="admin-settings-title">Информация о турнире</h2>
    <p class="admin-hint">Даты, взнос и срок регистрации обновятся на главной странице и в таймере. Всё время — по Москве.</p>
    <div class="admin-fields">
      <label class="admin-wide">Название турнира<input v-model.trim="draft.title" required maxlength="150"></label>
      <label>Дата начала<input v-model="draft.terms.startsOn" type="date" required></label>
      <label>Дата окончания<input v-model="draft.terms.endsOn" type="date" :min="draft.terms.startsOn" required></label>
      <label>Регистрация до, МСК<input :value="moscowInput(draft.terms.registrationClosesAt)" @input="draft.terms.registrationClosesAt = moscowIso($event.target.value)" type="datetime-local" required></label>
      <label>Взнос с команды, ₽<input v-model.number="draft.terms.entryFee" type="number" min="0" step="1" required></label>
      <label>Минимум команд<input v-model.number="draft.terms.minimumTeams" type="number" min="2" step="1" required><small>Верхнего лимита команд нет.</small></label>
      <label>Ссылка Twitch<input v-model.trim="draft.stream.url" type="url" placeholder="https://www.twitch.tv/channel"><small>Для встроенного плеера укажите канал Twitch.</small></label>
    </div>
    <h3>Распределение взносов</h3>
    <div class="admin-fields admin-shares"><label v-for="(label, key) in shareLabels" :key="key">{{ label }}, %<input v-model.number="draft.terms.prizeDistribution[key]" type="number" min="0" max="100" step="1" required></label></div>
    <p class="admin-hint" :class="{ accent: Object.values(draft.terms.prizeDistribution).reduce((sum, value) => sum + Number(value), 0) !== 100 }">Общая сумма: {{ Object.values(draft.terms.prizeDistribution).reduce((sum, value) => sum + Number(value), 0) }}%. Для сохранения нужна сумма 100%.</p>
  </section>
</template>
