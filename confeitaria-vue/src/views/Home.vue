<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Sidebar from '@/components/dashboard/Sidebar.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import RecentSaleItem from '@/components/dashboard/RecentSaleItem.vue'
import { ShoppingCart, DollarSign, PieChart, AlertTriangle } from 'lucide-vue-next'

import http from '@/lib/http'

type KpiCard = {
  title: string
  value: string
  subtitle: string
  subtitleClass?: string
  icon: any
}

type RecentSale = {
  title: string
  qty: string
  client: string
  price: string
  date: string
}

type LowStockItem = {
  id: number
  nome: string
  estoqueAtual: number
  estoqueMinimo: number
  unidadeMedida?: string
}

const kpis = ref<KpiCard[]>([])
const recentSales = ref<RecentSale[]>([])
const lowStockItems = ref<LowStockItem[]>([])
const error = ref<string | null>(null)

async function loadDashboard() {
  try {
    const { data } = await http.get('/estoque/dashboard')

    const payload: any = data

    if (!payload.success) {
      throw new Error(payload.message || 'Erro ao carregar dashboard')
    }

    const estoque = payload.data?.estoque ?? {}
    const alertas = payload.data?.alertas ?? {}

    // --- KPIs ------------------------------------------------
    const vendasHoje = Number(estoque.vendas_hoje ?? 0)
    const receitaHoje = Number(estoque.receita_hoje ?? 0)
    const receitaMensal = Number(estoque.receita_mensal ?? 0)
    const totalReceitas = Number(estoque.total_receitas ?? 0)
    const estoqueBaixo = Number(alertas.itens_estoque_baixo ?? 0)

    kpis.value = [
      {
        title: 'Vendas Hoje',
        value: String(vendasHoje),
        subtitle: `R$ ${receitaHoje.toFixed(2).replace('.', ',')} em receita`,
        icon: ShoppingCart,
      },
      {
        title: 'Receita Mensal',
        value: `R$ ${receitaMensal.toFixed(2).replace('.', ',')}`,
        subtitle: '↗ Mês atual',
        subtitleClass: 'text-green-600',
        icon: DollarSign,
      },
      {
        title: 'Total de Receitas',
        value: String(totalReceitas),
        subtitle: 'Receitas cadastradas',
        icon: PieChart,
      },
      {
        title: 'Estoque Baixo',
        value: String(estoqueBaixo),
        subtitle: 'Itens precisam reposição',
        subtitleClass: 'text-orange-600',
        icon: AlertTriangle,
      },
    ]

    // --- Itens com estoque baixo (lista) ---------------------
    // Ajuste aqui as chaves para bater com o que seu backend retornar.
    // Tente primeiro um array em alertas.itens_estoque_baixo_detalhes,
    // depois outras possibilidades.
    const itensBrutos =
      alertas.itens_estoque_baixo_detalhes ??
      alertas.itens_estoque_baixo_lista ??
      alertas.itens ??
      []

    if (Array.isArray(itensBrutos)) {
      lowStockItems.value = itensBrutos.map((it: any) => ({
        id: Number(it.id ?? it.insumo_id ?? 0),
        nome: it.nome ?? it.insumo_nome ?? 'Item sem nome',
        estoqueAtual: Number(
          it.estoque_atual ??
            it.qtd_atual ??
            it.quantidade ??
            0
        ),
        estoqueMinimo: Number(
          it.estoque_minimo ??
            it.qtd_minima ??
            0
        ),
        unidadeMedida: it.unidade_medida ?? it.unidade ?? undefined,
      }))
    } else {
      lowStockItems.value = []
    }

    // --- Vendas recentes (se já tiver no backend) ------------
    const vendasRecentes = payload.data?.vendas_recentes ?? []
    if (Array.isArray(vendasRecentes)) {
      recentSales.value = vendasRecentes.map((sale: any) => ({
        title: sale.produto ?? sale.nome_produto ?? 'Venda',
        qty: `${sale.quantidade ?? sale.qtd ?? 1}x`,
        client: sale.cliente ?? sale.nome_cliente ?? '',
        price: `R$ ${Number(sale.valor_total ?? sale.valor ?? 0)
          .toFixed(2)
          .replace('.', ',')}`,
        date: sale.data_formatada ?? sale.data ?? '',
      }))
    } else {
      recentSales.value = []
    }
  } catch (e: any) {
    console.error(e)
    if (e.response?.status === 401) {
      error.value = 'Não autorizado. Faça login antes de acessar o dashboard.'
    } else {
      error.value = e.message || 'Erro ao carregar dashboard.'
    }
  }
}

onMounted(() => {
  loadDashboard()
})
</script>



<template>
  <div class="page">
    <Sidebar />

    <main class="content">
      <header class="mb-4">
        <h1 class="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p class="text-gray-500 text-sm">Visão geral do seu negócio</p>
      </header>

      <!-- KPIs -->
      <section class="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          v-for="(kpi, i) in kpis"
          :key="i"
          :title="kpi.title"
          :value="kpi.value"
          :subtitle="kpi.subtitle"
          :subtitle-class="kpi.subtitleClass"
          :icon="kpi.icon"
        />
      </section>

   <section class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
  <!-- Alertas de estoque -->
  <div class="card lg:col-span-2">
    <div class="card-header">
      <h3>Alertas de Estoque</h3>
    </div>
    <div class="card-body">
      <!-- Nenhum item em alerta -->
      <p
        v-if="lowStockItems.length === 0"
        class="text-gray-500 text-sm"
      >
        Nenhum item com estoque baixo!
      </p>

      <!-- Lista de itens em alerta -->
      <div v-else class="space-y-2">
        <p class="text-orange-600 text-sm">
          Existem {{ lowStockItems.length }} item(s) com estoque baixo:
        </p>

        <ul
          class="divide-y rounded-lg border border-orange-200 bg-orange-50/40"
        >
          <li
            v-for="item in lowStockItems"
            :key="item.id"
            class="px-3 py-2 flex items-center justify-between text-xs md:text-sm"
          >
            <div>
              <div class="font-medium text-gray-900">
                {{ item.nome }}
              </div>
              <div class="text-gray-600">
                Estoque:
                <span class="font-semibold text-red-600">
                  {{ item.estoqueAtual }}
                </span>
                /
                {{ item.estoqueMinimo }}
                <span v-if="item.unidadeMedida">
                  {{ item.unidadeMedida }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Vendas recentes -->
  <div class="card">
    <div class="card-header">
      <h3>Vendas Recentes</h3>
    </div>
    <div class="divide-y">
      <RecentSaleItem
        v-for="(sale, i) in recentSales"
        :key="i"
        :title="sale.title"
        :qty="sale.qty"
        :client="sale.client"
        :price="sale.price"
        :date="sale.date"
      />
      <p
        v-if="recentSales.length === 0"
        class="text-gray-500 text-sm p-3"
      >
        Nenhuma venda recente registrada.
      </p>
    </div>
  </div>
</section>

    </main>
  </div>
</template>
