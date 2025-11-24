<script setup lang="ts">
import Sidebar from '../components/dashboard/Sidebar.vue'
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import http from '../lib/http'

type Status = 'pendente' | 'concluida'

type ProdutoOption = {
  id: number
  nome: string
}

type Venda = {
  id: number
  data: string           // já formatada pt-BR no front
  produto: string
  cliente: string
  qtd: number
  valor: number          // número em BRL
  status: Status
}

type VendaForm = {
  data: string           // "2025-11-08"
  produto_id: number | null
  cliente: string
  quantidade: string     // string para input
  valor_total: string    // string para input
  status: Status
}

/* ------------ Estado principal ------------ */

const vendas = ref<Venda[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const produtosOptions = ref<ProdutoOption[]>([])

/* ------------ Filtros simples ------------ */

const filtroBusca = ref('')
const filtroStatus = ref<'todos' | Status>('todos')

const vendasFiltradas = computed(() => {
  const termo = filtroBusca.value.toLowerCase().trim()

  return vendas.value.filter(v => {
    const matchTexto = termo
      ? v.produto.toLowerCase().includes(termo) ||
        v.cliente.toLowerCase().includes(termo)
      : true

    const matchStatus =
      filtroStatus.value === 'todos'
        ? true
        : v.status === filtroStatus.value

    return matchTexto && matchStatus
  })
})

/* ------------ KPIs ------------ */

const totalVendas = computed(() => vendas.value.length)

const vendasConcluidas = computed(
  () => vendas.value.filter(v => v.status === 'concluida').length
)

const receitaTotal = computed(() =>
  vendas.value
    .filter(v => v.status === 'concluida')
    .reduce((acc, v) => acc + v.valor, 0)
)

/* ------------ Helpers ------------ */

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateBR(dateStr: string) {
  // espera "YYYY-MM-DD"
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}

/** Converte resposta da API em Venda usada na tela */
function mapVendaApi(v: any): Venda {
  return {
    id: v.id,
    data: formatDateBR(v.data ?? v.data_venda ?? v.created_at?.substring(0, 10) ?? ''),
    produto: v.produto ?? v.nome_produto ?? '',
    cliente: v.cliente ?? v.nome_cliente ?? '',
    qtd: Number(v.quantidade ?? v.qtd ?? 0),
    valor: Number(v.valor_total ?? v.valor ?? 0),
    status: (v.status === 'concluida' ? 'concluida' : 'pendente') as Status,
  }
}

/* ------------ Carregar da API ------------ */
async function carregarProdutos() {
  try {
    const { data } = await http.get('/produtos')

    let lista: any[] = []
    if (Array.isArray(data)) {
      lista = data
    } else if (Array.isArray(data.data)) {
      lista = data.data
    } else if (Array.isArray(data.produtos)) {
      lista = data.produtos
    }

    produtosOptions.value = lista.map((p: any) => ({
      id: p.id,
      nome: p.nome ?? '',
    }))
  } catch (e) {
    console.error('Erro ao carregar produtos para o select de vendas', e)
  }
}

async function carregarVendas() {
  loading.value = true
  error.value = null

  try {
    const { data } = await http.get('/vendas')

    let lista: any[] = []
    if (Array.isArray(data)) {
      lista = data
    } else if (Array.isArray(data.data)) {
      lista = data.data
    } else if (Array.isArray(data.vendas)) {
      lista = data.vendas
    }

    vendas.value = lista.map(mapVendaApi)
  } catch (e: any) {
    console.error(e)
    error.value =
      e?.response?.data?.message || 'Erro ao carregar vendas. Verifique a API.'
  } finally {
    loading.value = false
  }
}

/* ------------ Formulário (modal) ------------ */

const showForm = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const form = ref<VendaForm>(getDefaultForm())
const formError = ref<string | null>(null)
const saving = ref(false)

function getDefaultForm(): VendaForm {
  const hoje = new Date()
  const yyyy = hoje.getFullYear()
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const dd = String(hoje.getDate()).padStart(2, '0')

  return {
    data: `${yyyy}-${mm}-${dd}`,
    produto_id: null,
    cliente: '',
    quantidade: '1',
    valor_total: '0',
    status: 'pendente',
  }
}



function novaVenda() {
  showForm.value = true
  isEditing.value = false
  editingId.value = null
  form.value = getDefaultForm()
  formError.value = null
}

function editar(v: Venda) {
  showForm.value = true
  isEditing.value = true
  editingId.value = v.id
  formError.value = null

  const [d, m, y] = v.data.split('/')
  const iso = y && m && d ? `${y}-${m}-${d}` : ''

  // tentar achar o produto pelo nome para marcar no select
  const prodMatch = produtosOptions.value.find(
    (p) => p.nome.toLowerCase() === v.produto.toLowerCase()
  )

  form.value = {
    data: iso,
    produto_id: prodMatch ? prodMatch.id : null,
    cliente: v.cliente,
    quantidade: String(v.qtd),
    valor_total: String(v.valor.toFixed(2)),
    status: v.status,
  }
}


function cancelarForm() {
  showForm.value = false
  formError.value = null
}

/* ------------ Salvar (POST/PUT) ------------ */

async function salvarForm() {
  if (!form.value.produto_id) {
    formError.value = 'Informe o produto.'
    return
  }
  const produtoId = form.value.produto_id
  const clienteNome = String(form.value.cliente ?? '').trim()
  const qtdNum = Number(
    String(form.value.quantidade ?? '0').replace(',', '.')
  )
  const valorNum = Number(
    String(form.value.valor_total ?? '0').replace(',', '.')
  )

  // validação básica
  if (!produtoId) {
    formError.value = 'Informe o produto.'
    return
  }

  if (!clienteNome) {
    formError.value = 'Informe o nome do cliente.'
    return
  }

  if (!qtdNum || qtdNum <= 0) {
    formError.value = 'Quantidade deve ser maior que zero.'
    return
  }

  if (!valorNum || valorNum <= 0) {
    formError.value = 'Valor deve ser maior que zero.'
    return
  }

  saving.value = true
  formError.value = null

  const payload = {
    data: form.value.data,
    produto_id: produtoId,
    cliente: clienteNome,
    quantidade: qtdNum,
    valor_total: valorNum,
    status: form.value.status,
  }

  try {
    if (isEditing.value && editingId.value !== null) {
      await http.put(`/vendas/${editingId.value}`, payload)
    } else {
      await http.post('/vendas', payload)
    }

    showForm.value = false
    await carregarVendas()
  } catch (e: any) {
    console.error(e)
    formError.value =
      e?.response?.data?.message || 'Erro ao salvar venda. Verifique a API.'
  } finally {
    saving.value = false
  }
}


/* ------------ Excluir ------------ */

async function excluir(v: Venda) {
  if (!confirm(`Deseja realmente excluir a venda de "${v.cliente}"?`)) return

  try {
    await http.delete(`/vendas/${v.id}`)
    vendas.value = vendas.value.filter((x) => x.id !== v.id)
  } catch (e: any) {
    console.error(e)
    alert(
      e?.response?.data?.message || 'Erro ao excluir venda. Verifique a API.'
    )
  }
}

/* ------------ Trocar status inline ------------ */

async function onTrocarStatus(v: Venda, novo: Status) {
  const antigo = v.status
  v.status = novo

  try {
    await http.put(`/vendas/${v.id}`, { status: novo })
  } catch (e) {
    console.error(e)
    v.status = antigo // rollback visual caso dê erro
  }
}

/* ------------ MOUNT ------------ */

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      carregarProdutos(),
      carregarVendas(),
    ])
  } finally {
    loading.value = false
  }
})

</script>




<template>
  <div class="page page--app">
    <Sidebar />

    <main class="content">
      <!-- Cabeçalho -->
      <div class="content-header">
        <div>
          <h1 class="page-title">Controle de Vendas</h1>
          <p class="page-sub">Gerencie seus pedidos e vendas</p>
        </div>

        <div class="flex flex-col gap-2 items-end">
          <!-- filtros desktop -->
          <div class="hidden md:flex items-center gap-2">
            <input
              v-model="filtroBusca"
              type="text"
              placeholder="Buscar por produto ou cliente..."
              class="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
            />
            <select
              v-model="filtroStatus"
              class="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
            >
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendentes</option>
              <option value="concluida">Concluídas</option>
            </select>
          </div>

          <button class="btn-primary btn-with-icon" @click="novaVenda">
            <Plus class="size-4" />
            Nova Venda
          </button>
        </div>
      </div>

      <!-- filtros mobile -->
      <div class="md:hidden mb-4 flex flex-col gap-2">
        <input
          v-model="filtroBusca"
          type="text"
          placeholder="Buscar por produto ou cliente..."
          class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
        />
        <select
          v-model="filtroStatus"
          class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendentes</option>
          <option value="concluida">Concluídas</option>
        </select>
      </div>

      <!-- KPIs -->
      <div class="grid md:grid-cols-3 gap-4 mb-6">
        <div class="kpi-card card">
          <div class="kpi-label">Total de Vendas</div>
          <div class="kpi-value">{{ totalVendas }}</div>
        </div>
        <div class="kpi-card card">
          <div class="kpi-label">Vendas Concluídas</div>
          <div class="kpi-value">{{ vendasConcluidas }}</div>
        </div>
        <div class="kpi-card card">
          <div class="kpi-label">Receita Total</div>
          <div class="kpi-value">{{ formatBRL(receitaTotal) }}</div>
        </div>
      </div>

      <!-- Estado de carregamento -->
      <p v-if="loading" class="text-xs text-gray-500 mt-3">
        Carregando vendas...
      </p>

      <!-- Tabela -->
      <div v-else class="card p-0">
        <div class="card-header">
          <h3>Histórico de Vendas</h3>
        </div>

        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Cliente</th>
                  <th>Quantidade</th>
                  <th>Valor Total</th>
                  <th>Status</th>
                  <th class="text-left">Atualizar</th>
                  <th class="th-actions">Ações</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="v in vendasFiltradas" :key="v.id">
                  <td>{{ v.data }}</td>
                  <td>{{ v.produto }}</td>
                  <td>{{ v.cliente }}</td>
                  <td>{{ v.qtd }}x</td>
                  <td>{{ formatBRL(v.valor) }}</td>

                  <td>
                    <span
                      :class="[
                        'badge',
                        v.status === 'concluida'
                          ? 'badge-success'
                          : 'badge-warning'
                      ]"
                    >
                      {{ v.status === 'concluida' ? 'Concluída' : 'Pendente' }}
                    </span>
                  </td>

                  <td>
                    <select
                      class="status-select"
                      :value="v.status"
                      @change="
                        onTrocarStatus(
                          v,
                          ($event.target as HTMLSelectElement)
                            .value as 'pendente' | 'concluida'
                        )
                      "
                    >
                      <option value="pendente">Pendente</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </td>

                  <td class="actions">
                    <button class="btn-icon" @click="editar(v)">
                      <Pencil class="size-4" />
                    </button>
                    <button class="btn-icon btn-danger" @click="excluir(v)">
                      <Trash2 class="size-4" />
                    </button>
                  </td>
                </tr>

                <tr v-if="!vendasFiltradas.length">
                  <td colspan="8" class="text-center text-xs text-gray-500 py-4">
                    Nenhuma venda encontrada com os filtros atuais.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal de formulário de venda -->
      <div
        v-if="showForm"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-gray-900">
              {{ isEditing ? 'Editar Venda' : 'Nova Venda' }}
            </h2>
            <button
              class="text-xs text-gray-500 hover:text-gray-700"
              @click="cancelarForm"
            >
              Fechar
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Data
              </label>
              <input
                v-model="form.data"
                type="date"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Status
              </label>
              <select
                v-model="form.status"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              >
                <option value="pendente">Pendente</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>

            <div class="md:col-span-2">
  <label class="block text-xs font-medium text-gray-600 mb-1">
    Produto
  </label>
  <select
    v-model="form.produto_id"
    class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
  >
    <option :value="null">Selecione um produto...</option>
    <option
      v-for="p in produtosOptions"
      :key="p.id"
      :value="p.id"
    >
      {{ p.nome }}
    </option>
  </select>
</div>


            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Cliente
              </label>
              <input
                v-model="form.cliente"
                type="text"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Quantidade
              </label>
              <input
                v-model="form.quantidade"
                type="number"
                min="1"
                step="1"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Valor total (R$)
              </label>
              <input
                v-model="form.valor_total"
                type="number"
                step="0.01"
                min="0"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              />
            </div>
          </div>

          <p v-if="formError" class="text-xs text-red-500 mb-3">
            {{ formError }}
          </p>

          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="text-xs text-gray-500 hover:text-gray-700"
              @click="cancelarForm"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn-primary px-4 py-2 text-sm"
              :disabled="saving"
              @click="salvarForm"
            >
              {{ saving ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="error" class="text-xs text-red-500 mt-3">
        {{ error }}
      </p>
    </main>
  </div>
</template>

<style scoped>
.kpi-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 96px;
}
.kpi-label {
  color: var(--color-gray-600);
  font-size: 0.875rem;
}
.kpi-value {
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--color-gray-900);
}
.status-select {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-gray-200);
  border-radius: 10px;
  background: #fff;
  font-size: 0.875rem;
}
.status-select:focus {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in oklab, var(--color-ring) 30%, transparent);
}
</style>




<style scoped>
/* KPIs */
.kpi-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 96px;
}
.kpi-label {
  color: var(--color-gray-600);
  font-size: 0.875rem;
}
.kpi-value {
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--color-gray-900);
}

/* Select visual do status */
.status-select {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-gray-200);
  border-radius: 10px;
  background: #fff;
  font-size: 0.875rem;
}
.status-select:focus {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in oklab, var(--color-ring) 30%, transparent);
}
</style>
