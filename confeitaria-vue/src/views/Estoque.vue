<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Sidebar from '../components/dashboard/Sidebar.vue'
import { Plus, Edit3, Eye, Trash2, X, Package } from 'lucide-vue-next'
import http from '../lib/http'

type Status = 'OK' | 'BAIXO'

type Item = {
  id: number
  nome: string
  quantidade: number
  unidade: string
  minimo: number
  custo: string
  fornecedor: string
  status: Status

  // campos extras para edição
  custoUnitario: number
  estoqueAtual: number
  estoqueMinimo: number
  unidadeMedida: string

  // extras para visualização
  categoria?: string | null
  codigoBarras?: string | null
  observacoes?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type InsumoForm = {
  nome: string
  unidade_medida: string
  custo_unitario: string | number
  estoque_atual: string | number
  estoque_minimo: string | number
}

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<Item[]>([])

// filtros
const searchTerm = ref('')
const statusFilter = ref<'ALL' | Status>('ALL')

// estado do formulário
const showForm = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const form = ref<InsumoForm>(getDefaultForm())
const formError = ref<string | null>(null)
const saving = ref(false)

// estado do modal de detalhes
const showDetails = ref(false)
const selectedItem = ref<Item | null>(null)

function getDefaultForm(): InsumoForm {
  return {
    nome: '',
    unidade_medida: 'kg', // padrão
    custo_unitario: '0',
    estoque_atual: '0',
    estoque_minimo: '0',
  }
}

function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('pt-BR')
}

// insumo da API -> Item exibido na tabela
function mapInsumoToItem(raw: any): Item {
  const estoqueAtual = Number(raw.estoque_atual ?? raw.quantidade ?? 0)
  const estoqueMinimo = Number(raw.estoque_minimo ?? raw.minimo ?? 0)
  const unidade = raw.unidade_medida ?? raw.unidade ?? 'un'
  const custoUnitario = Number(raw.custo_unitario ?? raw.custo ?? 0)
  const categoria = raw.categoria ?? null
  const fornecedor = raw.fornecedor ?? categoria ?? '—'
  const status: Status = estoqueAtual <= estoqueMinimo ? 'BAIXO' : 'OK'

  return {
    id: raw.id,
    nome: raw.nome ?? '',
    quantidade: estoqueAtual,
    unidade,
    minimo: estoqueMinimo,
    custo: formatCurrency(custoUnitario),
    fornecedor,
    status,
    custoUnitario,
    estoqueAtual,
    estoqueMinimo,
    unidadeMedida: unidade,
    categoria,
    codigoBarras: raw.codigo_barras ?? null,
    observacoes: raw.observacoes ?? null,
    createdAt: raw.created_at ?? null,
    updatedAt: raw.updated_at ?? null,
  }
}

async function carregarInsumos() {
  try {
    loading.value = true
    error.value = null

    const { data } = await http.get('/insumos')
    console.log('GET /insumos resposta:', data)

    let listaCrua: any[] = []

    if (Array.isArray(data)) {
      listaCrua = data
    } else if (Array.isArray(data.data)) {
      listaCrua = data.data
    } else if (Array.isArray(data.insumos)) {
      listaCrua = data.insumos
    } else if (data.data && Array.isArray(data.data.insumos)) {
      listaCrua = data.data.insumos
    } else if (data.data && Array.isArray(data.data.data)) {
      listaCrua = data.data.data
    } else {
      console.warn('Formato inesperado em /insumos:', data)
      listaCrua = []
    }

    items.value = listaCrua.map(mapInsumoToItem)
  } catch (e: any) {
    console.error(e)
    error.value =
      e?.response?.data?.message || 'Erro ao carregar itens de estoque.'
  } finally {
    loading.value = false
  }
}

/* ------------ FILTRO DINÂMICO ------------ */

const filteredItems = computed(() => {
  const term = searchTerm.value.toLowerCase().trim()

  return items.value.filter((item) => {
    // filtro por status
    if (statusFilter.value !== 'ALL' && item.status !== statusFilter.value) {
      return false
    }

    // sem texto = passa direto
    if (!term) return true

    const haystack = [
      item.nome,
      item.categoria || '',
      item.unidadeMedida || '',
      item.codigoBarras || '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(term)
  })
})

/* ------------ FORM ------------ */

function addItem() {
  showForm.value = true
  isEditing.value = false
  editingId.value = null
  form.value = getDefaultForm()
  formError.value = null
}

function verItem(row: Item) {
  selectedItem.value = row
  showDetails.value = true
}

function fecharDetalhes() {
  showDetails.value = false
  selectedItem.value = null
}

function editarItem(row: Item) {
  showForm.value = true
  isEditing.value = true
  editingId.value = row.id
  formError.value = null

  form.value = {
    nome: row.nome,
    unidade_medida: row.unidadeMedida || 'un',
    custo_unitario: row.custoUnitario ?? 0,
    estoque_atual: row.estoqueAtual ?? 0,
    estoque_minimo: row.estoqueMinimo ?? 0,
  }
}

function cancelarForm() {
  showForm.value = false
  form.value = getDefaultForm()
  formError.value = null
}

async function salvarForm() {
  if (!form.value.nome.trim()) {
    formError.value = 'Informe o nome do insumo.'
    return
  }

  saving.value = true
  formError.value = null

  const custoUnitario =
    Number(String(form.value.custo_unitario ?? '0').replace(',', '.')) || 0

  const payload = {
    nome: form.value.nome.trim(),
    unidade_medida: form.value.unidade_medida || 'un',
    custo_unitario: custoUnitario,
    estoque_atual: Number(form.value.estoque_atual) || 0,
    estoque_minimo: Number(form.value.estoque_minimo) || 0,
    estoque_maximo: null,
    categoria: null,
    codigo_barras: null,
    descricao: null,
    observacoes: null,
    ativo: 1,
  }

  try {
    if (isEditing.value && editingId.value !== null) {
      await http.put(`/insumos/${editingId.value}`, payload)
    } else {
      await http.post('/insumos', payload)
    }

    showForm.value = false
    form.value = getDefaultForm()
    await carregarInsumos()
  } catch (e: any) {
    console.error(e)
    formError.value =
      e?.response?.data?.message ||
      'Erro ao salvar insumo. Verifique o backend.'
  } finally {
    saving.value = false
  }
}

/* ------------ EXCLUIR ------------ */

async function excluirItem(row: Item) {
  if (!confirm(`Deseja realmente excluir "${row.nome}"?`)) return

  try {
    await http.delete(`/insumos/${row.id}`)
    items.value = items.value.filter((i) => i.id !== row.id)
  } catch (e: any) {
    console.error(e)
    alert(
      e?.response?.data?.message ||
        'Erro ao excluir insumo. Verifique o backend.'
    )
  }
}

onMounted(() => {
  carregarInsumos()
})
</script>

<template>
  <div class="page page--app">
    <Sidebar />

    <main class="content">
      <div class="content-header">
        <div>
          <h1 class="page-title">Controle de Estoque</h1>
          <p class="page-sub">Gerencie seus ingredientes e matérias-primas</p>
        </div>
        <button class="btn-primary btn-with-icon" @click="addItem">
          <Plus class="size-4" />
          Adicionar Item
        </button>
      </div>

      <!-- Formulário de criação/edição -->
      <section v-if="showForm" class="mb-6">
        <div class="card p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-gray-900 text-base">
              {{ isEditing ? 'Editar insumo' : 'Novo insumo' }}
            </h2>
            <button
              type="button"
              class="text-xs text-gray-500 hover:text-gray-700"
              @click="cancelarForm"
            >
              Cancelar
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Nome
              </label>
              <input
                v-model="form.nome"
                type="text"
                class="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Unidade de medida
              </label>
              <input
                v-model="form.unidade_medida"
                type="text"
                class="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Custo por unidade
              </label>
              <input
                v-model="form.custo_unitario"
                type="number"
                step="0.01"
                class="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Estoque atual
              </label>
              <input
                v-model="form.estoque_atual"
                type="number"
                class="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Estoque mínimo
              </label>
              <input
                v-model="form.estoque_minimo"
                type="number"
                class="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
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
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>

          <p v-if="formError" class="text-xs text-red-500">
            {{ formError }}
          </p>
        </div>
      </section>

      <div class="card card-table">
        <div class="card-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3>Ingredientes em Estoque</h3>

          <!-- Barra de filtros -->
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div class="relative w-full md:w-64">
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Buscar por nome, categoria ou código..."
                class="w-full rounded-lg border px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <select
              v-model="statusFilter"
              class="rounded-lg border px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              <option value="ALL">Todos os status</option>
              <option value="OK">Apenas OK</option>
              <option value="BAIXO">Apenas Baixo</option>
            </select>
          </div>
        </div>

        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Quantidade</th>
                  <th>Unidade</th>
                  <th>Estoque Mínimo</th>
                  <th>Custo/Unidade</th>
                  <th>Status</th>
                  <th class="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td class="td-loading" colspan="7">Carregando…</td>
                </tr>

                <!-- nenhum registro vindo da API -->
                <tr v-if="!loading && items.length === 0">
                  <td colspan="7" class="td-loading text-gray-500">
                    Nenhum insumo cadastrado.
                  </td>
                </tr>

                <!-- tem registros, mas o filtro não achou nada -->
                <tr
                  v-if="
                    !loading &&
                    items.length > 0 &&
                    filteredItems.length === 0
                  "
                >
                  <td colspan="7" class="td-loading text-gray-500">
                    Nenhum insumo encontrado para os filtros atuais.
                  </td>
                </tr>

                <tr v-for="row in filteredItems" :key="row.id">
                  <td>{{ row.nome }}</td>
                  <td>{{ row.quantidade }}</td>
                  <td>{{ row.unidade }}</td>
                  <td>{{ row.minimo }}</td>
                  <td>{{ row.custo }}</td>

                  <td>
                    <span
                      :class="[
                        'badge',
                        row.status === 'OK' ? 'badge-success' : 'badge-warning',
                      ]"
                    >
                      {{ row.status }}
                    </span>
                  </td>
                  <td class="actions">
                    <button class="btn-icon" @click="verItem(row)">
                      <Eye class="size-4" />
                    </button>
                    <button class="btn-icon" @click="editarItem(row)">
                      <Edit3 class="size-4" />
                    </button>
                    <button
                      class="btn-icon btn-danger"
                      @click="excluirItem(row)"
                    >
                      <Trash2 class="size-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <p v-if="error" class="text-xs text-red-500 p-3">
              {{ error }}
            </p>
          </div>
        </div>
      </div>

      <!-- MODAL DE DETALHES -->
      <div
        v-if="showDetails && selectedItem"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 md:p-7 relative"
        >
          <button
            class="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            @click="fecharDetalhes"
          >
            <X class="size-5" />
          </button>

          <div class="flex items-center gap-3 mb-4">
            <div
              class="h-10 w-10 rounded-xl bg-pink-50 flex items-center justify-center"
            >
              <Package class="size-5 text-pink-500" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900">
                {{ selectedItem.nome }}
              </h2>
              <p class="text-xs text-gray-500">
                Detalhes completos do insumo
              </p>
            </div>
          </div>

          <div class="mb-4">
            <span
              class="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium"
              :class="
                selectedItem.status === 'OK'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              "
            >
              Estoque {{ selectedItem.status === 'OK' ? 'Normal' : 'Baixo' }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-[11px] uppercase tracking-wide text-gray-500">
                Quantidade atual
              </p>
              <p class="font-medium text-gray-900">
                {{ selectedItem.quantidade }} {{ selectedItem.unidade }}
              </p>
            </div>

            <div>
              <p class="text-[11px] uppercase tracking-wide text-gray-500">
                Estoque mínimo
              </p>
              <p class="font-medium text-gray-900">
                {{ selectedItem.minimo }} {{ selectedItem.unidade }}
              </p>
            </div>

            <div>
              <p class="text-[11px] uppercase tracking-wide text-gray-500">
                Custo unitário
              </p>
              <p class="font-medium text-gray-900">
                {{ selectedItem.custo }}
              </p>
            </div>

            <div>
              <p class="text-[11px] uppercase tracking-wide text-gray-500">
                Unidade de medida
              </p>
              <p class="font-medium text-gray-900">
                {{ selectedItem.unidadeMedida.toUpperCase() }}
              </p>
            </div>

            <div>
              <p class="text-[11px] uppercase tracking-wide text-gray-500">
                Categoria
              </p>
              <p class="font-medium text-gray-900">
                {{ selectedItem.categoria || '—' }}
              </p>
            </div>

            <div>
              <p class="text-[11px] uppercase tracking-wide text-gray-500">
                Código de barras
              </p>
              <p class="font-medium text-gray-900">
                {{ selectedItem.codigoBarras || '—' }}
              </p>
            </div>
          </div>

          <div class="mt-4">
            <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
              Observações
            </p>
            <p class="text-sm text-gray-800 whitespace-pre-line">
              {{ selectedItem.observacoes || 'Nenhuma observação cadastrada.' }}
            </p>
          </div>

          <div
            class="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex flex-col gap-1 md:flex-row md:justify-between"
          >
            <span>
              Criado em:
              <span class="font-medium">
                {{ formatDate(selectedItem.createdAt || null) }}
              </span>
            </span>
            <span>
              Atualizado em:
              <span class="font-medium">
                {{ formatDate(selectedItem.updatedAt || null) }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
