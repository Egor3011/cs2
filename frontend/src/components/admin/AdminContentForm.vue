<script setup>
defineProps({ draft: { type: Object, required: true } })
const fields = [ ['heroLead', 'Короткий заголовок на главной'], ['heroDescription', 'Описание турнира'], ['preflightText', 'Важно перед стартом'], ['broadcastText', 'Информация о трансляциях'] ]
</script>
<template>
  <section aria-labelledby="admin-content-title">
    <h2 id="admin-content-title">Тексты сайта</h2>
    <p class="admin-hint">Обычный текст, без HTML. Даты, взнос и проценты подставляются из раздела «Турнир».</p>
    <div class="admin-fields"><label v-for="[key, label] in fields" :key="key" class="admin-wide">{{ label }}<textarea v-model="draft.content[key]" rows="3" maxlength="3000"></textarea></label>
      <label>Подпись контакта организатора<input v-model.trim="draft.content.organizerLabel" maxlength="150"></label>
      <label>Ссылка организатора<input v-model.trim="draft.content.organizerUrl" type="url"></label>
    </div>
    <h3>Шаги участия</h3>
    <article v-for="(step, index) in draft.content.participationSteps" :key="index" class="admin-edit-card">
      <div class="admin-card-heading"><strong>Шаг {{ index + 1 }}</strong><button type="button" class="text-button accent" @click="draft.content.participationSteps.splice(index, 1)">Удалить шаг</button></div>
      <div class="admin-fields"><label>Заголовок<input v-model.trim="step.title" required maxlength="150"></label><label>Описание<textarea v-model="step.text" required rows="2" maxlength="3000"></textarea></label></div>
    </article>
    <button type="button" class="admin-secondary" @click="draft.content.participationSteps.push({ title: '', text: '' })">+ Добавить шаг</button>
    <h3>Условия для команд</h3>
    <article v-for="(card, index) in draft.content.participationCards" :key="index" class="admin-edit-card"><div class="admin-fields"><label>Название условия<input v-model.trim="card.title" required maxlength="150"></label><label>Текст условия<textarea v-model="card.text" rows="3" required maxlength="3000"></textarea></label></div></article>
    <h3>Частые вопросы</h3>
    <p class="admin-hint">Вопросы о датах, взносе и минимуме команд обновляются автоматически. Остальные можно изменить здесь.</p>
    <article v-for="(faq, index) in draft.content.faqItems" :key="index" class="admin-edit-card">
      <div class="admin-card-heading"><strong>Вопрос {{ index + 1 }}</strong><button type="button" class="text-button accent" @click="draft.content.faqItems.splice(index, 1)">Удалить вопрос</button></div>
      <label>Вопрос<input v-model.trim="faq.question" required maxlength="300"></label>
      <label>Ответ<textarea :value="faq.answer.join('\n\n')" @input="faq.answer = $event.target.value.split(/\n\s*\n/).filter(text => text.trim())" required rows="4"></textarea><small>Пустая строка разделяет абзацы.</small></label>
    </article>
    <button type="button" class="admin-secondary" @click="draft.content.faqItems.push({ question: '', answer: [''] })">+ Добавить вопрос</button>
  </section>
</template>
