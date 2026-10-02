<template>
  <div
    class="bracket-match"
    :class="{
      'bracket-match--pink': path === 'pink',
      'bracket-match--blue': path === 'blue'
    }"
  >

    <div class="bracket-match__team">
      <span>
        {{ team1 }}
      </span>

      <strong>
        {{ score1 }}
      </strong>
    </div>

    <div class="bracket-match__team">
      <span>
        {{ team2 }}
      </span>

      <strong>
        {{ score2 }}
      </strong>
    </div>

  </div>
</template>


<script setup>
defineProps({
  team1: {
    type: String,
    required: true
  },

  team2: {
    type: String,
    required: true
  },

  score1: {
    type: String,
    required: true
  },

  score2: {
    type: String,
    required: true
  },
  
  path: {
    type: String,
    default: ''
  }
})
</script>