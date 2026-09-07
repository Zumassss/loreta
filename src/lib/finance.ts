import type {
  Config,
  DB,
  Despesa,
  Ingrediente,
  Ponto,
  Retirada,
  Sabor,
  Unidade,
  Venda,
} from './types'
import { mesDe } from './format'

/* ---------------------------------------------------------------
   Custos — do ingrediente até o custo de um brownie
   --------------------------------------------------------------- */

const BASE: Record<Unidade, { base: 'g' | 'ml' | 'un'; fator: number }> = {
  g: { base: 'g', fator: 1 },
  kg: { base: 'g', fator: 1000 },
  ml: { base: 'ml', fator: 1 },
  L: { base: 'ml', fator: 1000 },
  un: { base: 'un', fator: 1 },
}

/** custo do ingrediente por unidade base (g, ml ou un) */
export function custoPorUnidadeBase(ing: Ingrediente): number {
  const conv = BASE[ing.unidade]
  const qtdBase = ing.qtdPacote * conv.fator
  if (!qtdBase) return 0
  return ing.precoPacote / qtdBase
}

export function custoIngredienteNaReceita(
  ing: Ingrediente | undefined,
  qtd: number,
  unidade: Unidade,
): number {
  if (!ing) return 0
  const convItem = BASE[unidade]
  const convIng = BASE[ing.unidade]
  if (convItem.base !== convIng.base) return 0
  return custoPorUnidadeBase(ing) * qtd * convItem.fator
}

export interface CustoSabor {
  /** custo de 1 brownie */
  unitario: number
  /** custo da fornada inteira */
  fornada: number
  ingredientes: number
  extras: number
  /** true quando ainda não há receita nem custo manual */
  vazio: boolean
  /** true quando o custo veio do valor digitado à mão */
  manual: boolean
}

export function custoDoSabor(sabor: Sabor, ingredientes: Ingrediente[]): CustoSabor {
  const mapa = new Map(ingredientes.map((i) => [i.id, i]))
  const custoIngredientes = sabor.itens.reduce(
    (s, it) => s + custoIngredienteNaReceita(mapa.get(it.ingredienteId), it.qtd, it.unidade),
    0,
  )
  const custoExtras = sabor.extras.reduce((s, e) => s + (e.valor || 0), 0)
  const fornada = custoIngredientes + custoExtras
  const rende = sabor.rendimento > 0 ? sabor.rendimento : 0

  if (fornada > 0 && rende > 0) {
    return {
      unitario: fornada / rende,
      fornada,
      ingredientes: custoIngredientes,
      extras: custoExtras,
      vazio: false,
      manual: false,
    }
  }
  if (sabor.custoManual && sabor.custoManual > 0) {
    return {
      unitario: sabor.custoManual,
      fornada: sabor.custoManual * (rende || 1),
      ingredientes: 0,
      extras: 0,
      vazio: false,
      manual: true,
    }
  }
  return { unitario: 0, fornada: 0, ingredientes: 0, extras: 0, vazio: true, manual: false }
}

export type MapaCustos = Map<string, CustoSabor>

export function mapaDeCustos(db: DB): MapaCustos {
  return new Map(db.sabores.map((s) => [s.id, custoDoSabor(s, db.ingredientes)]))
}

/** preço sugerido a partir do custo e da margem alvo (margem sobre o preço) */
export function precoSugerido(custo: number, margemAlvo: number): number {
  if (custo <= 0) return 0
  const m = Math.min(Math.max(margemAlvo, 0), 0.9)
  const bruto = custo / (1 - m)
  // arredonda pra cima em R$ 0,50 — preço de balcão bonitinho
  return Math.ceil(bruto * 2) / 2
}

/* ---------------------------------------------------------------
   Vendas
   --------------------------------------------------------------- */

export const totalItens = (v: Venda) =>
  v.itens.reduce((s, i) => s + i.preco * i.qtd, 0)

export const unidadesVendidas = (v: Venda) => v.itens.reduce((s, i) => s + i.qtd, 0)

/** o faturamento que vale é o total informado; se não houver, soma os itens */
export const faturamentoVenda = (v: Venda) =>
  v.totalInformado > 0 ? v.totalInformado : totalItens(v)

/** diferença entre o total informado e a soma dos itens lançados */
export const divergencia = (v: Venda) =>
  v.totalInformado > 0 ? v.totalInformado - totalItens(v) : 0

export function cmvVenda(v: Venda, custos: MapaCustos): number {
  return v.itens.reduce((s, i) => s + (custos.get(i.saborId)?.unitario ?? 0) * i.qtd, 0)
}

export function taxaVenda(v: Venda, pontos: Ponto[]): number {
  const p = pontos.find((x) => x.id === v.pontoId)
  if (!p || !p.taxaPct) return 0
  return faturamentoVenda(v) * (p.taxaPct / 100)
}

/* ---------------------------------------------------------------
   Resultado do período (DRE simplificada)
   --------------------------------------------------------------- */

export interface Resultado {
  faturamento: number
  cmv: number
  taxas: number
  margemContribuicao: number
  custosFixos: number
  lucro: number
  margemPct: number
  unidades: number
  ticketMedio: number
  precoMedio: number
  custoMedio: number
  /** % das unidades vendidas que já têm custo cadastrado */
  cobertura: number
  meses: number
}

export function resultado(
  vendas: Venda[],
  custos: MapaCustos,
  pontos: Ponto[],
  config: Config,
  mesesContados?: number,
): Resultado {
  const faturamento = vendas.reduce((s, v) => s + faturamentoVenda(v), 0)
  const cmv = vendas.reduce((s, v) => s + cmvVenda(v, custos), 0)
  const taxas = vendas.reduce((s, v) => s + taxaVenda(v, pontos), 0)
  const unidades = vendas.reduce((s, v) => s + unidadesVendidas(v), 0)
  const comCusto = vendas.reduce(
    (s, v) =>
      s +
      v.itens.reduce(
        (t, i) => t + ((custos.get(i.saborId)?.unitario ?? 0) > 0 ? i.qtd : 0),
        0,
      ),
    0,
  )
  const meses =
    mesesContados ??
    (new Set(vendas.map((v) => mesDe(v.data))).size || (vendas.length ? 1 : 0))
  const custosFixos = (config.custoFixoMensal || 0) * meses
  const margemContribuicao = faturamento - cmv - taxas
  const lucro = margemContribuicao - custosFixos
  return {
    faturamento,
    cmv,
    taxas,
    margemContribuicao,
    custosFixos,
    lucro,
    margemPct: faturamento > 0 ? lucro / faturamento : 0,
    unidades,
    ticketMedio: vendas.length ? faturamento / vendas.length : 0,
    precoMedio: unidades ? faturamento / unidades : 0,
    custoMedio: unidades ? cmv / unidades : 0,
    cobertura: unidades ? comCusto / unidades : 1,
    meses,
  }
}

/* ---------------------------------------------------------------
   Divisão do lucro — a "regra dos potinhos"
   --------------------------------------------------------------- */

export interface Divisao {
  julia: number
  giro: number
  reserva: number
}

export function dividirLucro(lucro: number, config: Config): Divisao {
  const soma = config.splitJulia + config.splitGiro + config.splitReserva || 100
  const base = Math.max(lucro, 0)
  return {
    julia: (base * config.splitJulia) / soma,
    giro: (base * config.splitGiro) / soma,
    reserva: (base * config.splitReserva) / soma,
  }
}

/* ---------------------------------------------------------------
   Caixa de verdade (fluxo de dinheiro)
   --------------------------------------------------------------- */

export interface Caixa {
  entradas: number
  saidas: number
  retiradas: number
  saldo: number
  /** parte do saldo que está reservada para repor os insumos da próxima fornada */
  reposicao: number
  /** quanto a Julia já pode tirar sem descapitalizar a Loreta */
  disponivelJulia: number
  cotaJulia: number
}

export function caixa(
  vendas: Venda[],
  despesas: Despesa[],
  retiradas: Retirada[],
  custos: MapaCustos,
  pontos: Ponto[],
  config: Config,
): Caixa {
  const entradas = vendas.reduce((s, v) => s + faturamentoVenda(v), 0)
  const saidas = despesas.reduce((s, d) => s + d.valor, 0)
  const tirado = retiradas.reduce((s, r) => s + r.valor, 0)
  const res = resultado(vendas, custos, pontos, config)
  const cota = dividirLucro(res.lucro, config).julia
  return {
    entradas,
    saidas,
    retiradas: tirado,
    saldo: entradas - saidas - tirado,
    reposicao: res.cmv,
    cotaJulia: cota,
    disponivelJulia: Math.max(cota - tirado, 0),
  }
}

/* ---------------------------------------------------------------
   Ponto de equilíbrio e metas
   --------------------------------------------------------------- */

export function pontoEquilibrio(res: Resultado, config: Config) {
  const margemUnit = res.precoMedio - res.custoMedio
  const fixo = config.custoFixoMensal || 0
  return {
    margemUnit,
    unidades: margemUnit > 0 ? Math.ceil(fixo / margemUnit) : 0,
    faturamento: margemUnit > 0 && res.precoMedio > 0 ? (fixo / margemUnit) * res.precoMedio : 0,
  }
}

/* ---------------------------------------------------------------
   Recortes / rankings
   --------------------------------------------------------------- */

export function porPonto(vendas: Venda[], pontos: Ponto[], custos: MapaCustos) {
  const mapa = new Map<string, { ponto: Ponto; faturamento: number; unidades: number; lucro: number; dias: number }>()
  for (const p of pontos) mapa.set(p.id, { ponto: p, faturamento: 0, unidades: 0, lucro: 0, dias: 0 })
  for (const v of vendas) {
    const alvo = mapa.get(v.pontoId)
    if (!alvo) continue
    const fat = faturamentoVenda(v)
    alvo.faturamento += fat
    alvo.unidades += unidadesVendidas(v)
    alvo.lucro += fat - cmvVenda(v, custos) - taxaVenda(v, pontos)
    alvo.dias += 1
  }
  return [...mapa.values()].filter((x) => x.dias > 0).sort((a, b) => b.faturamento - a.faturamento)
}

export function porSabor(vendas: Venda[], sabores: Sabor[], custos: MapaCustos) {
  const mapa = new Map<
    string,
    { sabor: Sabor; unidades: number; faturamento: number; lucro: number; precoMedio: number }
  >()
  for (const s of sabores)
    mapa.set(s.id, { sabor: s, unidades: 0, faturamento: 0, lucro: 0, precoMedio: 0 })
  for (const v of vendas)
    for (const i of v.itens) {
      const alvo = mapa.get(i.saborId)
      if (!alvo) continue
      const custo = custos.get(i.saborId)?.unitario ?? 0
      alvo.unidades += i.qtd
      alvo.faturamento += i.preco * i.qtd
      alvo.lucro += (i.preco - custo) * i.qtd
    }
  return [...mapa.values()]
    .filter((x) => x.unidades > 0)
    .map((x) => ({ ...x, precoMedio: x.faturamento / x.unidades }))
    .sort((a, b) => b.unidades - a.unidades)
}

/** faturamento dos últimos N meses, do mais antigo pro mais novo */
export function seriePorMes(vendas: Venda[], n = 6) {
  const hojeD = new Date()
  const meses: { ym: string; total: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hojeD.getFullYear(), hojeD.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    meses.push({ ym, total: 0 })
  }
  for (const v of vendas) {
    const alvo = meses.find((m) => m.ym === mesDe(v.data))
    if (alvo) alvo.total += faturamentoVenda(v)
  }
  return meses
}
