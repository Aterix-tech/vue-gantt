import { createRouter, createWebHistory } from 'vue-router'
import GanttView from '../views/GanttView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/gantt',
      name: 'gantt',
      component: GanttView,
    },
    {
      // Redirect root to /gantt
      path: '/',
      redirect: '/gantt',
    },
    {
      // Catch-all: redirect unknown routes to /gantt
      path: '/:pathMatch(.*)*',
      redirect: '/gantt',
    },
  ],
})

export default router
