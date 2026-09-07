export type Unidade = 'g' | 'kg' | 'ml' | 'L' | 'un'

export interface Ingrediente {
  id: string
  nome: string
  /** quanto se paga no pacote/embalagem comprada */
  precoPacote: number
  /** quanto vem no pacote, na unidade escolhida */
  qtdPacote: number
  unidade: Unidade
}

export interface ItemReceita {
  id: string
  ingredienteId: string
  /** quantidade usada na receita inteira */
  qtd: number
  unidade: Unidade
}

export interface ExtraReceita {
  id: string
  nome: string
  valor: number
}

export interface Sabor {
  id: string
  nome: string
  ativo: boolean
  /** quantos brownies saem de uma fornada dessa receita */
  rendimento: number
  itens: ItemReceita[]
  /** custos por fornada que não são ingrediente: gás, embalagem, etiqueta... */
  extras: ExtraReceita[]
  /** usado enquanto a receita não estiver preenchida */
  custoManual?: number
  precoSugerido?: number
}

export interface Ponto {
  id: string
  nome: string
  ativo: boolean
  /** % que o local/parceiro fica com o faturamento (0 = nenhuma) */
  taxaPct: number
}

export interface ItemVenda {
  id: string
  saborId: string
  preco: number
  qtd: number
}

export interface Venda {
  id: string
  data: string // YYYY-MM-DD
  pontoId: string
  /** faturamento total informado do dia naquele ponto */
  totalInformado: number
  itens: ItemVenda[]
  obs?: string
  criadoEm: number
}

export type CategoriaDespesa =
  | 'ingredientes'
  | 'embalagem'
  | 'transporte'
  | 'equipamento'
  | 'taxas'
  | 'outros'

export interface Despesa {
  id: string
  data: string
  categoria: CategoriaDespesa
  descricao: string
  valor: number
}

export interface Retirada {
  id: string
  data: string
  valor: number
  obs?: string
}

export interface Config {
  /** divisão do lucro (soma 100) */
  splitJulia: number
  splitGiro: number
  splitReserva: number
  metaMensal: number
  custoFixoMensal: number
  margemAlvo: number
}

export interface DB {
  versao: number
  pontos: Ponto[]
  sabores: Sabor[]
  ingredientes: Ingrediente[]
  vendas: Venda[]
  despesas: Despesa[]
  retiradas: Retirada[]
  config: Config
}
