import { createRouter, createWebHistory } from 'vue-router'

import MatchView from '@/views/MatchView.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },

  routes: [
    {
      path: '/admin',
      component: () => import('@/views/AdminView.vue')
    },
    {
      path: '/',
      component: () => import('@/views/TournamentView.vue')
    },
    {
      path: '/matches/:id',
      component: MatchView
    }
  ]
})

export default router
