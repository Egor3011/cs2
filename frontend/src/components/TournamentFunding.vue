<script setup>
import { computed, ref, watch } from 'vue'
import { contributionBreakdown, formatRubles } from '@/utils/tournamentTerms'

const props = defineProps({ terms: { type: Object, required: true } })
const teamCount = ref(props.terms.minimumTeams)
watch(() => props.terms.minimumTeams, minimum => { if (teamCount.value < minimum) teamCount.value = minimum })
const example = computed(() => teamCount.value >= props.terms.minimumTeams ? contributionBreakdown(teamCount.value, props.terms.entryFee, props.terms.prizeDistribution) : null)
const places = [ { key: 'first', title: '1 место', note: 'Победитель турнира' }, { key: 'second', title: '2 место', note: 'Финалист' }, { key: 'third', title: '3 место', note: 'Победитель матча за бронзу' }, { key: 'organization', title: 'Организация', note: 'Проведение мероприятия' } ]
</script>

<template>
  <section v-reveal id="prizes" class="funding-section" aria-labelledby="funding-title">
    <div class="section-heading"><div><span class="section-kicker">02 / ВЗНОСЫ И ПРИЗОВЫЕ</span><h2 id="funding-title">За что боремся</h2></div><span class="section-aside">Прозрачный расчёт</span></div>
    <div class="funding-intro">
      <p>Вступительный взнос — <strong class="accent">{{ formatRubles(terms.entryFee) }} с команды</strong>. Призовой фонд формируется из взносов участников.</p>
      <p><strong>85% всей суммы взносов — призёрам.</strong> Оставшиеся 15% получает организатор за проведение мероприятия.</p>
    </div>
    <div class="funding-calculator">
      <label for="funding-team-count">Пример расчёта для <input id="funding-team-count" v-model.number="teamCount" type="number" :min="terms.minimumTeams" step="1" inputmode="numeric" aria-describedby="funding-calculator-note"> команд</label>
      <p v-if="example" class="funding-total">Общая сумма взносов <strong>{{ formatRubles(example.total) }}</strong></p>
      <p v-else class="funding-error" role="status">Введите целое число команд от {{ terms.minimumTeams }}.</p>
    </div>
    <div class="funding-breakdown">
      <article v-for="place in places" :key="place.key" :class="{ 'funding-place--organization': place.key === 'organization' }">
        <h3>{{ place.title }}</h3><strong class="funding-percent" :class="{ 'accent': place.key === 'first' }">{{ terms.prizeDistribution[place.key] }}%</strong>
        <span class="funding-amount">{{ example ? formatRubles(example.payouts[place.key]) : '—' }}</span><small>{{ place.note }}</small>
      </article>
    </div>
    <p id="funding-calculator-note" class="funding-note">Все проценты считаются от общей суммы взносов. Это пример: итоговые суммы зависят от числа команд, оплативших участие.</p>
    <p class="minimum-teams-note">Турнир проводится при участии <strong>не менее {{ terms.minimumTeams }} команд</strong>. Верхнего лимита команд нет.</p>
  </section>
</template>
