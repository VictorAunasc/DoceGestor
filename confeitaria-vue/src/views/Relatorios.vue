<script setup lang="ts">
import { ref, computed, defineComponent, h, onMounted } from 'vue'
import Sidebar from '../components/dashboard/Sidebar.vue'
import http from '../lib/http'

type ProdutoAnalytics = {
  produto_id: number
  produto: string
  quantidade: number
  receita: number
  custo: number
  lucro: number
  margem: number
}

type SerieDiaria = {
  labels: string[]
  valores: number[]
}

const produtos = ref<ProdutoAnalytics[]>([])
const serie = ref<SerieDiaria>({ labels: [], valores: [] })

const carregando = ref(false)
const erro = ref<string | null>(null)

/* ------------ Carregar do backend ------------ */

async function carregarRelatorio() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await http.get('/relatorios/analytics')

    if (!data?.success) {
      throw new Error(data?.message || 'Erro ao carregar relatórios.')
    }

    const payload = data.data || {}

    produtos.value = (payload.produtos || []) as ProdutoAnalytics[]
    serie.value = {
      labels: payload.serie_diaria?.labels || [],
      valores: payload.serie_diaria?.valores || [],
    }
  } catch (e: any) {
    console.error(e)
    erro.value = e?.response?.data?.message || e.message || 'Erro ao carregar relatórios.'
  } finally {
    carregando.value = false
  }
}

onMounted(() => {
  carregarRelatorio()
})

/* ------------ Totais/indicadores ------------ */

const receitaTotal = computed(() =>
  produtos.value.reduce((s, p) => s + p.receita, 0)
)

const custoTotal = computed(() =>
  produtos.value.reduce((s, p) => s + p.custo, 0)
)

const lucroLiquido = computed(() => receitaTotal.value - custoTotal.value)

const margemLiquida = computed(() =>
  receitaTotal.value === 0 ? 0 : (lucroLiquido.value / receitaTotal.value) * 100
)

/* ------------ Série diária ------------ */

const dias = computed(() => serie.value.labels)
const receitaPorDia = computed(() => serie.value.valores)
const maxLinha = computed(() =>
  Math.max(1, ...(receitaPorDia.value.length ? receitaPorDia.value : [0]))
)

/* ------------ Totais por produto ------------ */

const totalPorProduto = computed<[string, number][]>(() =>
  produtos.value
    .map(p => [p.produto, p.receita] as [string, number])
    .sort((a, b) => b[1] - a[1])
)

const qtdPorProduto = computed<[string, number][]>(() =>
  produtos.value
    .map(p => [p.produto, p.quantidade] as [string, number])
    .sort((a, b) => b[1] - a[1])
)

/* ------------ PieSlice (igual você já tinha) ------------ */

const PieSlice = defineComponent({
  name: 'PieSlice',
  props: {
    index: { type: Number, required: true },
    rows:  { type: Array as () => [string, number][], required: true }
  },
  setup(props) {
    const d = computed(() => {
      const total = props.rows.reduce((s, r) => s + r[1], 0) || 1
      const startAngle = props.rows
        .slice(0, props.index)
        .reduce((s, r) => s + (r[1] / total) * Math.PI * 2, 0)
      const angle = (props.rows[props.index][1] / total) * Math.PI * 2
      const endAngle = startAngle + angle

      const cx = 130, cy = 130, r = 90
      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)
      const largeArc = angle > Math.PI ? 1 : 0

      return [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ')
    })
    const fill = ['#ff6fb2','#f33c9b','#ffa34d','#7dd3fc','#a78bfa']

    return () => h('path', {
      d: d.value,
      fill: fill[props.index % fill.length],
      stroke: '#fff',
      'stroke-width': 2
    })
  }
})

/* ------------ Helpers de formatação ------------ */

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const pct = (v: number) =>
  `${(Math.round(v * 10) / 10).toLocaleString('pt-BR')}%`

/* ------------ Linhas da tabela de lucratividade ------------ */

const lucratividade = computed(() =>
  produtos.value.map(p => ({
    produto: p.produto,
    receita: p.receita,
    custo:   p.custo,
    lucro:   p.lucro,
    margem:  p.margem,
  }))
)
</script>

<template>
  <div class="page page--app">
    <Sidebar />

    <main class="content">
      <div class="content-header">
        <div>
          <h1 class="page-title">Relatórios e Análises</h1>
          <p class="page-sub">Visualize o desempenho do seu negócio</p>
        </div>

        <!-- Filtro (placeholder) -->
        <button class="btn-secondary">Este Ano ▾</button>
      </div>

      <p v-if="erro" class="text-xs text-red-500 mb-2">
        {{ erro }}
      </p>

      <!-- Cards topo -->
      <div class="grid lg:grid-cols-3 gap-6 mb-6">
        <div class="card p-4">
          <div class="text-sm text-gray-600 mb-1">Receita Total</div>
          <div class="text-2xl font-semibold text-gray-900">{{ fmt(receitaTotal) }}</div>
          <div class="text-xs text-green-600 mt-1">✓ Vendas concluídas</div>
        </div>

        <div class="card p-4">
          <div class="text-sm text-gray-600 mb-1">Custo Total</div>
          <div class="text-2xl font-semibold text-gray-900">{{ fmt(custoTotal) }}</div>
          <div class="text-xs text-gray-500 mt-1">Matéria-prima utilizada</div>
        </div>

        <div class="card p-4">
          <div class="text-sm text-gray-600 mb-1">Lucro Líquido</div>
          <div
            class="text-2xl font-semibold"
            :class="lucroLiquido >= 0 ? 'text-gray-900' : 'text-red-500'"
          >
            {{ fmt(lucroLiquido) }}
          </div>
          <div
            class="text-xs mt-1"
            :class="margemLiquida >= 0 ? 'text-green-600' : 'text-red-500'"
          >
            Margem: {{ pct(margemLiquida) }}
          </div>
        </div>
      </div>

      <!-- Linha + Pizza -->
      <div class="grid lg:grid-cols-2 gap-6">
        <!-- Receita diária -->
        <div class="card p-4">
          <h3 class="text-sm font-medium text-gray-900 mb-2">
            Receita Diária (Últimos 7 dias)
          </h3>

          <div v-if="carregando && !receitaPorDia.length" class="text-xs text-gray-500">
            Carregando série diária...
          </div>

          <svg
            v-else
            viewBox="0 0 600 300"
            class="w-full h-[260px]"
          >
            <!-- grade -->
            <g stroke="#eee">
              <line v-for="y in 4" :key="y" :x1="40" :x2="580" :y1="y*60" :y2="y*60" />
            </g>
            <!-- eixo -->
            <g stroke="#ddd">
              <line x1="40" y1="280" x2="580" y2="280" />
              <line x1="40" y1="20"  x2="40"  y2="280" />
            </g>
            <!-- rótulos X -->
            <g fill="#9aa" font-size="11">
              <text
                v-for="(d,i) in dias"
                :key="d"
                :x="40 + i*80"
                y="295"
                text-anchor="middle"
              >
                {{ d }}
              </text>
            </g>
            <!-- linha -->
            <polyline
              :points="receitaPorDia.map((v,i)=>`${40+i*80},${280-(v/maxLinha)*240}`).join(' ')"
              fill="none"
              stroke="#ff4fa1"
              stroke-width="3"
            />
            <!-- pontos -->
            <circle
              v-for="(v,i) in receitaPorDia"
              :key="i"
              :cx="40 + i*80"
              :cy="280 - (v/maxLinha) * 240"
              r="3.5"
              fill="#ff4fa1"
            />
          </svg>
        </div>

        <!-- Pizza por produto -->
        <div class="card p-4">
          <h3 class="text-sm font-medium text-gray-900 mb-2">
            Distribuição de Vendas por Produto
          </h3>

          <div v-if="!totalPorProduto.length" class="text-xs text-gray-500">
            Nenhuma venda no período.
          </div>

          <div
            v-else
            class="flex items-center justify-center"
          >
            <svg width="260" height="260" viewBox="0 0 260 260">
              <g>
                <PieSlice
                  v-for="(_, idx) in totalPorProduto"
                  :key="idx"
                  :index="idx"
                  :rows="totalPorProduto"
                />
              </g>
            </svg>
          </div>

          <div
            v-if="totalPorProduto.length"
            class="mt-2 text-xs text-gray-500 text-center"
          >
            {{ totalPorProduto[1]?.[0] ?? '' }}:
            {{
              Math.round(((totalPorProduto[1]?.[1] ?? 0) / Math.max(1, receitaTotal)) * 100)
            }}%
            •
            {{ totalPorProduto[0]?.[0] ?? '' }}:
            {{
              Math.round(((totalPorProduto[0]?.[1] ?? 0) / Math.max(1, receitaTotal)) * 100)
            }}%
          </div>
        </div>
      </div>

      <!-- Tabela de lucratividade -->
      <div class="card p-4 mt-6">
        <h3 class="text-sm font-medium text-gray-900 mb-3">
          Análise de Lucratividade por Produto
        </h3>

        <div v-if="!lucratividade.length" class="text-xs text-gray-500">
          Nenhum dado disponível para o período.
        </div>

        <div v-else class="table-responsive">
          <table class="table w-full">
            <thead>
              <tr>
                <th>Produto</th>
                <th class="text-right">Receita</th>
                <th class="text-right">Custo</th>
                <th class="text-right">Lucro</th>
                <th class="text-right">Margem %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in lucratividade" :key="row.produto">
                <td>{{ row.produto }}</td>
                <td class="text-right">{{ fmt(row.receita) }}</td>
                <td class="text-right">{{ fmt(row.custo) }}</td>
                <td
                  class="text-right"
                  :class="row.lucro >= 0 ? 'text-green-600' : 'text-red-500'"
                >
                  {{ fmt(row.lucro) }}
                </td>
                <td
                  class="text-right"
                  :class="row.margem >= 0 ? 'text-green-600' : 'text-red-500'"
                >
                  {{ pct(row.margem) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Barras: top produtos -->
      <div class="card p-4 mt-6">
        <h3 class="text-sm font-medium text-gray-900 mb-3">
          Top 5 Produtos Mais Vendidos
        </h3>

        <div v-if="!qtdPorProduto.length" class="text-xs text-gray-500">
          Nenhum dado disponível para o período.
        </div>

        <svg
          v-else
          viewBox="0 0 700 300"
          class="w-full h-[260px]"
        >
          <g>
            <template
              v-for="(par, i) in qtdPorProduto.slice(0,5)"
              :key="par[0]"
            >
              <!-- barra de quantidade -->
              <rect
                :x="80 + i*120"
                :y="260 - (par[1] / Math.max(1, ...qtdPorProduto.map(q=>q[1]))) * 200"
                width="28"
                :height="(par[1] / Math.max(1, ...qtdPorProduto.map(q=>q[1]))) * 200"
                fill="#ff6fb2"
              />
              <!-- barra de receita -->
              <rect
                :x="80 + i*120 + 34"
                :y="260 - ((totalPorProduto.find(p=>p[0]===par[0])?.[1] ?? 0) / Math.max(1, ...totalPorProduto.map(p=>p[1]))) * 200"
                width="28"
                :height="((totalPorProduto.find(p=>p[0]===par[0])?.[1] ?? 0) / Math.max(1, ...totalPorProduto.map(p=>p[1]))) * 200"
                fill="#ffa34d"
              />
              <text
                :x="80 + i*120 + 28"
                y="280"
                text-anchor="middle"
                font-size="11"
                fill="#9aa"
              >
                {{ par[0].length > 14 ? par[0].slice(0,14)+'…' : par[0] }}
              </text>
            </template>
          </g>

          <g font-size="11" fill="#9aa">
            <rect x="520" y="16" width="12" height="12" fill="#ff6fb2" />
            <text x="538" y="26">Quantidade</text>
            <rect x="520" y="36" width="12" height="12" fill="#ffa34d" />
            <text x="538" y="46">Receita (R$)</text>
          </g>
        </svg>
      </div>
    </main>
  </div>
</template>

<style scoped>
.table th, .table td { padding: .75rem 1rem; }
.table th { color: #6b7280; font-weight: 600; font-size: .875rem; }
.table td { color: #111827; font-size: .875rem; }
</style>
