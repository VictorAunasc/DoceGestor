<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { Cake, Package, BookOpen, ShoppingCart, BarChart, LogOut, User2, LayoutGrid } from 'lucide-vue-next'

const router = useRouter()
function logout() {
  // aqui você pode chamar seu store/auth.logout()
  router.push({ name: 'auth' })
}
</script>

<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="px-4 pt-4 pb-3 flex items-center gap-3">
      <div class="logo-badge shrink-0">
        <Cake class="size-6 text-white" />
      </div>
      <div>
        <div class="text-sm font-semibold text-gray-900 leading-tight">Doce Gestor</div>
        <div class="text-xs text-gray-500">Sistema de Gestão</div>
      </div>
    </div>

    <!-- Nav -->
    <nav class="mt-2 px-2 space-y-1">
      <RouterLink
        to="/"
        class="nav-item"
        exact-active-class="is-active"
      >
        <LayoutGrid class="size-4" />
        <span>Dashboard</span>
      </RouterLink>

      <RouterLink
        to="/estoque"
        class="nav-item"
        exact-active-class="is-active"
      >
        <Package class="size-4" />
        <span>Estoque</span>
      </RouterLink>

      <RouterLink
        to="/receitas"
        class="nav-item"
        exact-active-class="is-active"
      >
        <BookOpen class="size-4" />
        <span>Receitas</span>
      </RouterLink>

      <RouterLink
        to="/vendas"
        class="nav-item"
        exact-active-class="is-active"
      >
        <ShoppingCart class="size-4" />
        <span>Vendas</span>
      </RouterLink>

      <RouterLink
        to="/relatorios"
        class="nav-item"
        exact-active-class="is-active"
      >
        <BarChart class="size-4" />
        <span>Relatórios</span>
      </RouterLink>
    </nav>

    <!-- Footer user -->
    <div class="mt-auto px-3 pb-3">
      <div class="user-card">
        <div class="user-avatar">
          <User2 class="size-4 text-gray-500" />
        </div>
        <div class="min-w-0">
          <div class="text-xs font-medium text-gray-900 truncate">
            VICTOR HUGO DE JESU...
          </div>
          <div class="text-[11px] text-gray-500 truncate">sw</div>
        </div>
      </div>
      <button class="btn-secondary w-full mt-2" @click="logout">
        <LogOut class="size-4" /> <span>Sair</span>
      </button>
    </div>
  </aside>
</template>
