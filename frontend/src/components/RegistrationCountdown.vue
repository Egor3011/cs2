<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { registrationCountdown } from '@/utils/tournamentTerms'

const props = defineProps({ deadline: { type: String, required: true } })
const emit = defineEmits(['closed'])
const now = ref(Date.now())
const countdown = computed(() => registrationCountdown(props.deadline, now.value))
const units = [{ key: 'days', label: 'дней' }, { key: 'hours', label: 'часов' }, { key: 'minutes', label: 'минут' }, { key: 'seconds', label: 'секунд' }]
const deadlineText = computed(() => {
  const date = new Date(props.deadline)
  if (Number.isNaN(date.getTime())) return 'Уточняется'
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' }).format(date)
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(date)
  return `${day}, ${time} МСК`
})
const timerLabel = computed(() => `Осталось ${countdown.value.days} дней, ${countdown.value.hours} часов, ${countdown.value.minutes} минут, ${countdown.value.seconds} секунд`)
watch(() => countdown.value.closed, closed => emit('closed', closed), { immediate: true })
const updateClock = () => { now.value = Date.now() }
let interval
onMounted(() => {
  interval = window.setInterval(updateClock, 1000)
  document.addEventListener('visibilitychange', updateClock)
})
onUnmounted(() => {
  clearInterval(interval)
  document.removeEventListener('visibilitychange', updateClock)
})
</script>

<template>
  <section class="registration-countdown" aria-labelledby="countdown-title">
    <div class="registration-countdown__intro">
      <span class="section-kicker accent">{{ countdown.closed ? 'ПРИЁМ ЗАЯВОК ЗАКРЫТ' : 'УСПЕЙТЕ ЗАЯВИТЬ КОМАНДУ' }}</span>
      <h2 id="countdown-title">{{ countdown.closed ? 'Регистрация завершена' : 'До окончания регистрации' }}</h2>
      <p>Регистрация до <time :datetime="deadline"><strong>{{ deadlineText }}</strong></time>.</p>
    </div>
    <div v-if="!countdown.closed" class="countdown-clock" role="timer" :aria-label="timerLabel" aria-live="off">
      <div v-for="unit in units" :key="unit.key"><strong>{{ String(countdown[unit.key]).padStart(2, '0') }}</strong><span>{{ unit.label }}</span></div>
    </div>
    <p v-else class="countdown-closed" role="status">Новые заявки не принимаются.</p>
  </section>
</template>
