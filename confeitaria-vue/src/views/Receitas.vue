<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Sidebar from '../components/dashboard/Sidebar.vue'
import { Plus, Pencil, Trash2, Cake } from 'lucide-vue-next'
import http from '../lib/http'

/* ------------ Tipos principais ------------ */

type Receita = {
  id: number
  nome: string
  categoria: string
  prepMin: number
  rendimento: string
  custo: string
  preco: string
  margem: number

  // campos para edição / envio pro backend
  precoBase: number
  unidadeMedida: string
  estoqueAtual: number
  estoqueMinimo: number
  controlaEstoque: boolean
  descricao: string | null
}

type ProdutoForm = {
  nome: string
  descricao: string | null
  preco_base: string
  unidade_medida: string
  estoque_atual: string
  estoque_minimo: string
  controla_estoque: boolean
}

/* ------------ Tipos para composição da receita ------------ */

type InsumoOption = {
  id: number
  nome: string
  unidade_medida: string
  custo_unitario: number
}

type ReceitaItemRow = {
  insumo_id: number | null
  quantidade: string
  unidade_medida: string
  insumo_nome?: string
}

type FiltroMargem = 'todas' | 'positiva' | 'negativa' | 'zero'

const filtroBusca = ref('')
const filtroMargem = ref<FiltroMargem>('todas')

/* ------------ Estado principal (produtos/receitas) ------------ */

const receitas = ref<Receita[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// estado do formulário de produto
const showForm = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const form = ref<ProdutoForm>(getDefaultForm())
const formError = ref<string | null>(null)
const saving = ref(false)

/* ------------ Computed de filtros ------------ */

const receitasFiltradas = computed(() => {
  const termo = filtroBusca.value.toLowerCase().trim()

  return receitas.value.filter((r) => {
    const matchNome = termo
      ? r.nome.toLowerCase().includes(termo)
      : true

    let matchMargem = true
    if (filtroMargem.value === 'positiva') matchMargem = r.margem > 0
    else if (filtroMargem.value === 'negativa') matchMargem = r.margem < 0
    else if (filtroMargem.value === 'zero') matchMargem = r.margem === 0

    return matchNome && matchMargem
  })
})

function getDefaultForm(): ProdutoForm {
  return {
    nome: '',
    descricao: '',
    preco_base: '0',
    unidade_medida: 'un',
    estoque_atual: '0',
    estoque_minimo: '0',
    controla_estoque: true,
  }
}

function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// produto vindo da API -> Receita que a tela usa
function mapProdutoToReceita(prod: any): Receita {
  const precoBase = Number(prod.preco_base ?? 0)

  return {
    id: prod.id,
    nome: prod.nome ?? '',
    categoria: '—',
    prepMin: 0,
    rendimento: prod.unidade_medida ? `1 ${prod.unidade_medida}` : '—',

    custo: '—', // será calculado depois
    preco: formatCurrency(precoBase),
    margem: 0,  // será calculado depois

    precoBase,
    unidadeMedida: prod.unidade_medida ?? 'un',
    estoqueAtual: Number(prod.estoque_atual ?? 0),
    estoqueMinimo: Number(prod.estoque_minimo ?? 0),
    controlaEstoque: Boolean(prod.controla_estoque ?? 0),
    descricao: prod.descricao ?? null,
  }
}

async function carregarReceitas() {
  try {
    error.value = null

    const { data } = await http.get('/produtos')

    let listaCrua: any[] = []
    if (Array.isArray(data)) {
      listaCrua = data
    } else if (Array.isArray(data.data)) {
      listaCrua = data.data
    } else if (Array.isArray(data.produtos)) {
      listaCrua = data.produtos
    }

    receitas.value = listaCrua.map(mapProdutoToReceita)
  } catch (e: any) {
    console.error(e)
    error.value =
      e?.response?.data?.message || 'Erro ao carregar receitas/produtos.'
  }
}

/* ---------- FORM PRODUTO ---------- */

function novaReceita() {
  showForm.value = true
  isEditing.value = false
  editingId.value = null
  form.value = getDefaultForm()
  formError.value = null
}

function editar(r: Receita) {
  showForm.value = true
  isEditing.value = true
  editingId.value = r.id
  formError.value = null

  form.value = {
    nome: r.nome,
    descricao: r.descricao ?? '',
    preco_base: String(r.precoBase ?? 0),
    unidade_medida: r.unidadeMedida || 'un',
    estoque_atual: String(r.estoqueAtual ?? 0),
    estoque_minimo: String(r.estoqueMinimo ?? 0),
    controla_estoque: r.controlaEstoque,
  }
}

function cancelarForm() {
  showForm.value = false
  form.value = getDefaultForm()
  formError.value = null
}

async function salvarForm() {
  if (!form.value.nome.trim()) {
    formError.value = 'Informe o nome do produto.'
    return
  }

  saving.value = true
  formError.value = null

  const precoRaw = form.value.preco_base as any
  let precoBase: number

  if (typeof precoRaw === 'string') {
    precoBase = Number(precoRaw.replace(',', '.')) || 0
  } else {
    precoBase = Number(precoRaw) || 0
  }

  const payload = {
    nome: form.value.nome.trim(),
    descricao: form.value.descricao || null,
    preco_base: precoBase,
    unidade_medida: form.value.unidade_medida || 'un',
    estoque_atual: Number(form.value.estoque_atual) || 0,
    estoque_minimo: Number(form.value.estoque_minimo) || 0,
    controla_estoque: form.value.controla_estoque ? 1 : 0,
  }

  try {
    if (isEditing.value && editingId.value !== null) {
      await http.put(`/produtos/${editingId.value}`, payload)
    } else {
      await http.post('/produtos', payload)
    }

    showForm.value = false
    form.value = getDefaultForm()
    await carregarReceitas()
    await recalcularCustosEMargensParaTodos()
  } catch (e: any) {
    console.error(e)
    formError.value =
      e?.response?.data?.message ||
      'Erro ao salvar produto. Verifique o backend.'
  } finally {
    saving.value = false
  }
}

/* ---------- EXCLUIR PRODUTO ---------- */

async function excluir(r: Receita) {
  if (!confirm(`Deseja realmente excluir "${r.nome}"?`)) return

  try {
    await http.delete(`/produtos/${r.id}`)
    receitas.value = receitas.value.filter((rec) => rec.id !== r.id)
  } catch (e: any) {
    console.error(e)
    alert(
      e?.response?.data?.message ||
        'Erro ao excluir produto. Verifique o backend.',
    )
  }
}

const margemClass = (v: number) => (v >= 0 ? 'text-green-600' : 'text-red-500')

/* ---------- ESTADO DA COMPOSIÇÃO DA RECEITA ---------- */

const showRecipeModal = ref(false)
const receitaCarregando = ref(false)
const receitaSalvando = ref(false)
const receitaSelecionadaId = ref<number | null>(null)
const produtoSelecionadoId = ref<number | null>(null)
const receitaItens = ref<ReceitaItemRow[]>([])
const receitaErro = ref<string | null>(null)

const insumosOptions = ref<InsumoOption[]>([])

/* ---------- CARREGAR INSUMOS PARA O SELECT ---------- */

async function carregarInsumosOptions() {
  try {
    const { data } = await http.get('/insumos', {
      params: { per_page: 9999, ativo: 1 },
    })

    let lista: any[] = []

    if (Array.isArray(data)) {
      lista = data
    } else if (Array.isArray(data.data)) {
      lista = data.data
    } else if (data.data && Array.isArray(data.data.data)) {
      lista = data.data.data
    } else if (data.data && Array.isArray(data.data.insumos)) {
      lista = data.data.insumos
    }

    insumosOptions.value = lista.map((i: any) => ({
      id: i.id,
      nome: i.nome,
      unidade_medida: i.unidade_medida ?? 'un',
      custo_unitario: Number(
        i.custo_unitario ??
          i.preco_unitario ??
          i.preco ??
          0,
      ),
    }))
  } catch (e) {
    console.error(e)
  }
}

/* ---------- ABRIR MODAL DE COMPOSIÇÃO ---------- */

async function abrirComposicao(r: Receita) {
  receitaErro.value = null
  receitaItens.value = []
  receitaSelecionadaId.value = null
  produtoSelecionadoId.value = r.id
  showRecipeModal.value = true
  receitaCarregando.value = true

  try {
    // 1) tentar buscar receita existente do produto
    const { data } = await http.get('/receitas', {
      params: { produto_id: r.id },
    })

    let receita: any | null = null

    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      receita = data.data[0]
    } else if (Array.isArray(data) && data.length > 0) {
      receita = data[0]
    }

    // 2) se não existir receita, criar uma básica
    if (!receita) {
      const resp = await http.post('/receitas', {
        produto_id: r.id,
        nome: r.nome,
        tempo_preparo_min: r.prepMin || 0,
        rendimento: r.rendimento || '',
        modo_preparo: null,
        observacoes: null,
      })

      receita = resp.data?.data ?? resp.data
    }

    receitaSelecionadaId.value = receita.id

    // 3) carregar itens da receita desse produto
    await carregarItensReceita(receita.id)
  } catch (e: any) {
    console.error(e)
    receitaErro.value =
      e?.response?.data?.message ||
      'Erro ao carregar a composição da receita.'
  } finally {
    receitaCarregando.value = false
  }
}

/* ---------- CARREGAR ITENS DA RECEITA ---------- */

async function carregarItensReceita(receitaId: number) {
  receitaCarregando.value = true
  receitaErro.value = null
  receitaItens.value = []

  try {
    const { data } = await http.get(`/receitas/${receitaId}/itens`)

    let itens: any[] = []

    if (Array.isArray(data)) {
      itens = data
    } else if (Array.isArray(data.data)) {
      itens = data.data
    }

    if (itens.length === 0) {
      receitaItens.value = [
        {
          insumo_id: null,
          quantidade: '0',
          unidade_medida: '',
          insumo_nome: '',
        },
      ]
      return
    }

    receitaItens.value = itens.map((it: any) => {
      // pode vir como pivot (belongsToMany) ou como ReceitaItem com relation insumo
      const insumo = it.insumo ?? it
      const quantidade = it.quantidade ?? it.pivot?.quantidade ?? 0
      const unidade_medida =
        it.unidade_medida ??
        it.pivot?.unidade_medida ??
        insumo?.unidade_medida ??
        ''

      return {
        insumo_id: it.insumo_id ?? it.id ?? null,
        quantidade: String(quantidade ?? '0'),
        unidade_medida,
        insumo_nome: insumo?.nome ?? '',
      }
    })
  } catch (e: any) {
    console.error(e)
    receitaErro.value =
      e?.response?.data?.message || 'Erro ao carregar itens da receita.'
  } finally {
    receitaCarregando.value = false
  }
}

/* ---------- EDITAR LINHAS DA COMPOSIÇÃO ---------- */

function adicionarLinhaReceita() {
  receitaItens.value.push({
    insumo_id: null,
    quantidade: '0',
    unidade_medida: '',
    insumo_nome: '',
  })
}

function removerLinhaReceita(index: number) {
  receitaItens.value.splice(index, 1)
  if (receitaItens.value.length === 0) {
    adicionarLinhaReceita()
  }
}

/* ---------- CÁLCULOS ---------- */

function extrairQuantidadeRendimento(rendimento: string): number {
  if (!rendimento) return 1
  const match = rendimento.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return 1
  const n = Number(match[1].replace(',', '.'))
  return n || 1
}

function calcularCustoTotalLocal(itensPayload: { insumo_id: number | null; quantidade: number }[]): number {
  return itensPayload.reduce((total, item) => {
    if (!item.insumo_id) return total
    const insumo = insumosOptions.value.find(i => i.id === item.insumo_id)
    const custoUnitario = insumo?.custo_unitario ?? 0
    return total + custoUnitario * item.quantidade
  }, 0)
}

async function recalcularCustoEMargemDoProduto(produto: Receita) {
  try {
    // 1) Buscar receita desse produto
    const { data } = await http.get('/receitas', {
      params: { produto_id: produto.id },
    })

    let receita: any | null = null

    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      receita = data.data[0]
    } else if (Array.isArray(data) && data.length > 0) {
      receita = data[0]
    }

    if (!receita) {
      produto.custo = '—'
      produto.margem = 0
      return
    }

    // 2) Buscar itens da receita
    const respItens = await http.get(`/receitas/${receita.id}/itens`)
    let itens: any[] = []

    if (Array.isArray(respItens.data)) {
      itens = respItens.data
    } else if (Array.isArray(respItens.data?.data)) {
      itens = respItens.data.data
    }

    const itensPayload = itens.map((it: any) => ({
      insumo_id: it.insumo_id ?? it.id ?? null,
      quantidade: Number(
        it.quantidade ??
          it.pivot?.quantidade ??
          0,
      ),
    }))

    if (!itensPayload.length) {
      produto.custo = '—'
      produto.margem = 0
      return
    }

    const custoTotal = calcularCustoTotalLocal(itensPayload)

    const qtdRendimento = extrairQuantidadeRendimento(produto.rendimento)
    const custoPorUnidade =
      qtdRendimento > 0 ? custoTotal / qtdRendimento : custoTotal

    produto.custo = formatCurrency(custoPorUnidade)

    const margemNum =
      produto.precoBase > 0
        ? ((produto.precoBase - custoPorUnidade) / produto.precoBase) * 100
        : 0

    produto.margem = Number(margemNum.toFixed(1))
  } catch (e) {
    console.error('Erro ao recalcular custo/margem do produto', produto.id, e)
  }
}

async function recalcularCustosEMargensParaTodos() {
  if (!insumosOptions.value.length) {
    await carregarInsumosOptions()
  }

  for (const produto of receitas.value) {
    await recalcularCustoEMargemDoProduto(produto)
  }
}

/* ---------- SALVAR COMPOSIÇÃO DA RECEITA ---------- */

async function salvarComposicao() {
  if (!receitaSelecionadaId.value) return

  receitaSalvando.value = true
  receitaErro.value = null

  try {
    const itensPayload = receitaItens.value
      .filter((row) => row.insumo_id)
      .map((row) => ({
        insumo_id: row.insumo_id,
        quantidade: Number(row.quantidade) || 0,
        unidade_medida: row.unidade_medida || null,
      }))

    if (itensPayload.length === 0) {
      receitaErro.value = 'Adicione pelo menos um insumo na receita.'
      receitaSalvando.value = false
      return
    }

    await http.post(`/receitas/${receitaSelecionadaId.value}/itens`, {
      itens: itensPayload,
    })

    const custoTotal = calcularCustoTotalLocal(itensPayload)

    if (produtoSelecionadoId.value !== null) {
      const produto = receitas.value.find(p => p.id === produtoSelecionadoId.value)
      if (produto) {
        const qtdRendimento = extrairQuantidadeRendimento(produto.rendimento)
        const custoPorUnidade =
          qtdRendimento > 0 ? custoTotal / qtdRendimento : custoTotal

        produto.custo = formatCurrency(custoPorUnidade)

        const margemNum =
          produto.precoBase > 0
            ? ((produto.precoBase - custoPorUnidade) / produto.precoBase) * 100
            : 0

        produto.margem = Number(margemNum.toFixed(1))
      }
    }

    showRecipeModal.value = false
  } catch (e: any) {
    console.error(e)
    receitaErro.value =
      e?.response?.data?.message ||
      'Erro ao salvar composição da receita.'
  } finally {
    receitaSalvando.value = false
  }
}

function fecharRecipeModal() {
  showRecipeModal.value = false
}

/* ---------- MOUNT ---------- */

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([carregarReceitas(), carregarInsumosOptions()])
    await recalcularCustosEMargensParaTodos()
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
          <h1 class="page-title">Receitas</h1>
          <p class="page-sub">Gerencie suas receitas e produtos</p>
        </div>

        <div class="flex flex-col gap-2 items-end">
          <!-- Filtros (desktop) -->
          <div class="hidden md:flex items-center gap-2">
            <input
              v-model="filtroBusca"
              type="text"
              placeholder="Buscar por nome..."
              class="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
            />

            <select
              v-model="filtroMargem"
              class="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
            >
              <option value="todas">Todas as margens</option>
              <option value="positiva">Margem positiva</option>
              <option value="negativa">Margem negativa</option>
              <option value="zero">Margem zerada</option>
            </select>
          </div>

          <button class="btn-primary btn-with-icon" @click="novaReceita">
            <Plus class="size-4" />
            Nova Receita
          </button>
        </div>
      </div>

      <!-- Filtros (mobile) -->
      <div class="md:hidden mb-4 flex flex-col gap-2">
        <input
          v-model="filtroBusca"
          type="text"
          placeholder="Buscar por nome..."
          class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
        />

        <select
          v-model="filtroMargem"
          class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
        >
          <option value="todas">Todas as margens</option>
          <option value="positiva">Margem positiva</option>
          <option value="negativa">Margem negativa</option>
          <option value="zero">Margem zerada</option>
        </select>
      </div>

      <!-- Form de criação/edição de produto -->
      <section v-if="showForm" class="mb-6">
        <div class="card p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-gray-900 text-base">
              {{ isEditing ? 'Editar produto/receita' : 'Nova produto/receita' }}
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
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Unidade de medida
              </label>
              <input
                v-model="form.unidade_medida"
                type="text"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Preço de venda (preço base)
              </label>
              <input
                v-model="form.preco_base"
                type="number"
                step="0.01"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Estoque atual
              </label>
              <input
                v-model="form.estoque_atual"
                type="number"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Estoque mínimo
              </label>
              <input
                v-model="form.estoque_minimo"
                type="number"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
              />
            </div>

            <div class="flex items-center mt-6 md:mt-0">
              <input
                id="controla_estoque"
                v-model="form.controla_estoque"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 text-black"
              />
              <label for="controla_estoque" class="ml-2 text-xs text-gray-700">
                Controlar estoque deste produto
              </label>
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-gray-600 mb-1">
                Descrição
              </label>
              <textarea
                v-model="form.descricao"
                rows="2"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 text-black"
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

      <!-- Estado de carregamento -->
      <p v-if="loading" class="text-xs text-gray-500 mt-3">
        Carregando receitas...
      </p>

      <!-- Cards -->
      <div v-else class="recipes-grid">
        <article
          v-for="r in receitasFiltradas"
          :key="r.id"
          class="card recipe-card"
        >
          <span class="recipe-chip">{{ r.categoria }}</span>

          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="logo-badge">
                <Cake class="size-4" />
              </div>
              <div class="text-gray-900 font-semibold text-base">
                {{ r.nome }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-10 gap-y-2 md:text-sm text-[13px]">
            <div class="meta-label">Tempo de preparo:</div>
            <div class="meta-value">{{ r.prepMin }} min</div>

            <div class="meta-label">Rendimento:</div>
            <div class="meta-value">{{ r.rendimento }}</div>

            <div class="meta-label">Custo:</div>
            <div class="meta-value">{{ r.custo }}</div>

            <div class="meta-label">Preço de venda:</div>
            <div class="meta-value">{{ r.preco }}</div>

            <div class="meta-label">Margem de lucro:</div>
            <div :class="['meta-value font-medium', margemClass(r.margem)]">
              {{ r.margem.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }}%
            </div>
          </div>

          <div class="mt-4 flex items-center gap-3">
            <button class="btn-secondary w-full" @click="editar(r)">
              <Pencil class="size-4" /> Editar
            </button>
            <button class="btn-secondary w-full" @click="abrirComposicao(r)">
              <Cake class="size-4" /> Composição
            </button>
            <button
              class="btn-icon btn-danger"
              title="Excluir"
              @click="excluir(r)"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        </article>

        <!-- Caso nenhum item passe nos filtros -->
        <div
          v-if="!receitasFiltradas.length && !loading"
          class="col-span-full text-xs text-gray-500 mt-3"
        >
          Nenhuma receita encontrada com os filtros atuais.
        </div>
      </div>

      <!-- Modal de composição da receita -->
      <div
        v-if="showRecipeModal"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-gray-900">
              Composição da Receita
            </h2>
            <button
              class="text-xs text-gray-500 hover:text-gray-700"
              @click="fecharRecipeModal"
            >
              Fechar
            </button>
          </div>

          <div v-if="receitaCarregando" class="text-sm text-gray-500 mb-3">
            Carregando…
          </div>

          <div v-else class="space-y-3">
            <div class="table-responsive max-h-72 overflow-y-auto border rounded-lg">
              <table class="table w-full text-sm">
                <thead>
                  <tr>
                    <th class="px-3 py-2 text-left">Insumo</th>
                    <th class="px-3 py-2 text-left">Quantidade</th>
                    <th class="px-3 py-2 text-left">Unidade</th>
                    <th class="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, index) in receitaItens"
                    :key="index"
                  >
                    <td class="px-3 py-2">
                      <select
                        v-model="row.insumo_id"
                        class="w-full rounded-lg border px-2 py-1 text-sm text-gray-900"
                      >
                        <option :value="null">Selecione…</option>
                        <option
                          v-for="opt in insumosOptions"
                          :key="opt.id"
                          :value="opt.id"
                        >
                          {{ opt.nome }}
                        </option>
                      </select>
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model="row.quantidade"
                        type="number"
                        step="0.01"
                        class="w-full rounded-lg border px-2 py-1 text-sm text-gray-900"
                      />
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model="row.unidade_medida"
                        type="text"
                        class="w-full rounded-lg border px-2 py-1 text-sm text-gray-900"
                        placeholder="ex: kg, un, g"
                      />
                    </td>
                    <td class="px-3 py-2 text-right">
                      <button
                        type="button"
                        class="text-xs text-red-500 hover:text-red-700"
                        @click="removerLinhaReceita(index)"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              type="button"
              class="text-xs text-pink-600 hover:text-pink-700"
              @click="adicionarLinhaReceita"
            >
              + Adicionar insumo
            </button>

            <p v-if="receitaErro" class="text-xs text-red-500">
              {{ receitaErro }}
            </p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                class="text-xs text-gray-500 hover:text-gray-700"
                @click="fecharRecipeModal"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn-primary px-4 py-2 text-sm"
                :disabled="receitaSalvando"
                @click="salvarComposicao"
              >
                {{ receitaSalvando ? 'Salvando…' : 'Salvar composição' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="error" class="text-xs text-red-500 mt-3">
        {{ error }}
      </p>
    </main>
  </div>
</template>


