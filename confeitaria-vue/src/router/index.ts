import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/auth', name: 'auth', component: () => import('../views/Auth.vue'), meta: { public: true, title: 'Entrar | Doce Gestor' } },
  { path: '/', name: 'home', component: () => import('../views/Home.vue'), meta: { title: 'Dashboard | Doce Gestor' } },
  { path: '/estoque', name: 'estoque', component: () => import('../views/Estoque.vue'), meta: { title: 'Estoque | Doce Gestor' } },
  { path: '/receitas', name: 'receitas', component: () => import('../views/Receitas.vue'), meta: { title: 'Receitas | Doce Gestor' } },
  { path: '/vendas', name: 'vendas', component: () => import('../views/Vendas.vue'), meta: { title: 'Vendas | Doce Gestor' } },
  { path: '/relatorios', name: 'relatorios', component: () => import('../views/Relatorios.vue'), meta: { title: 'Relatórios | Doce Gestor' } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'auth' }
  if (to.meta?.title) document.title = to.meta.title as string
})

export default router
