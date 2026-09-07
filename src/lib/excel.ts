/**
 * Gera a planilha do Excel da Loreta — com a cara da marca:
 * logo na capa, cabeçalhos vinho, listras azuis nas linhas e valores em R$.
 * O exceljs só é baixado quando a Julia clica em exportar.
 */
import type { DB } from './types'
import { dataCurta, nomeMes } from './format'
import {
  caixa as calcCaixa,
  custoDoSabor,
  custoPorUnidadeBase,
  dividirLucro,
  faturamentoVenda,
  cmvVenda,
  mapaDeCustos,
  pontoEquilibrio,
  porPonto,
  porSabor,
  precoSugerido,
  resultado,
  taxaVenda,
  unidadesVendidas,
} from './finance'

const VINHO = 'FF67130F'
const VINHO_CLARO = 'FF8A322C'
const AZUL = 'FFBFD7EA'
const AZUL_PALIDO = 'FFEDF4FA'
const CREME = 'FFFFFCF8'
const CREME_2 = 'FFFDF5EC'
const PESSEGO = 'FFF1C998'
const TINTA = 'FF3A1512'

const MOEDA = 'R$ #,##0.00'
const PORCENTO = '0%'

type Aba = import('exceljs').Worksheet
type Livro = import('exceljs').Workbook

interface Coluna {
  titulo: string
  chave: string
  largura: number
  formato?: string
}

const borda = (cor = 'FFE3D3CE') =>
  ({
    top: { style: 'thin' as const, color: { argb: cor } },
    left: { style: 'thin' as const, color: { argb: cor } },
    bottom: { style: 'thin' as const, color: { argb: cor } },
    right: { style: 'thin' as const, color: { argb: cor } },
  })

/** monta uma tabela bonitinha começando na linha informada */
function tabela(aba: Aba, colunas: Coluna[], linhas: Record<string, unknown>[], inicio: number) {
  aba.columns = colunas.map((c) => ({ key: c.chave, width: c.largura }))

  const cab = aba.getRow(inicio)
  colunas.forEach((c, i) => {
    const cel = cab.getCell(i + 1)
    cel.value = c.titulo
    cel.font = { name: 'Calibri', bold: true, size: 11, color: { argb: CREME } }
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VINHO } }
    cel.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right' }
    cel.border = borda(VINHO)
  })
  cab.height = 24

  linhas.forEach((linha, idx) => {
    const r = aba.getRow(inicio + 1 + idx)
    r.height = 19
    colunas.forEach((c, i) => {
      const cel = r.getCell(i + 1)
      cel.value = (linha[c.chave] ?? '') as never
      cel.font = { name: 'Calibri', size: 11, color: { argb: TINTA } }
      cel.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? CREME : AZUL_PALIDO },
      }
      cel.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right' }
      cel.border = borda()
      if (c.formato) cel.numFmt = c.formato
    })
  })

  if (linhas.length === 0) {
    const r = aba.getRow(inicio + 1)
    const cel = r.getCell(1)
    cel.value = 'Nada lançado ainda ♡'
    cel.font = { name: 'Calibri', italic: true, size: 11, color: { argb: VINHO_CLARO } }
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREME_2 } }
  }

  aba.views = [{ state: 'frozen', ySplit: inicio }]
  return inicio + linhas.length + 1
}

/** faixa de título no topo de cada aba, no estilo das listras da marca */
function titulo(aba: Aba, texto: string, subtitulo: string, colunas: number) {
  aba.mergeCells(1, 1, 1, Math.max(colunas, 2))
  const t = aba.getRow(1)
  t.height = 32
  const cel = t.getCell(1)
  cel.value = texto
  cel.font = { name: 'Calibri', bold: true, size: 16, color: { argb: VINHO } }
  cel.alignment = { vertical: 'middle' }
  cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREME_2 } }

  aba.mergeCells(2, 1, 2, Math.max(colunas, 2))
  const s = aba.getRow(2)
  s.height = 18
  const cs = s.getCell(1)
  cs.value = subtitulo
  cs.font = { name: 'Calibri', size: 10, italic: true, color: { argb: VINHO_CLARO } }
  cs.alignment = { vertical: 'middle' }
  cs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREME_2 } }

  // linha listrada azul separando o título do conteúdo
  const listra = aba.getRow(3)
  listra.height = 6
  for (let i = 1; i <= Math.max(colunas, 2); i++) {
    listra.getCell(i).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: i % 2 ? AZUL : CREME },
    }
  }
}

async function imagemBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const buf = await resp.arrayBuffer()
    let bin = ''
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin)
  } catch {
    return null
  }
}

/* ---------------------------------------------------------------
   Capa / resumo
   --------------------------------------------------------------- */

async function abaResumo(wb: Livro, db: DB) {
  const aba = wb.addWorksheet('Resumo', {
    properties: { tabColor: { argb: VINHO }, defaultRowHeight: 18 },
    pageSetup: { paperSize: 9, orientation: 'portrait' },
  })
  aba.columns = [
    { width: 3 },
    { width: 34 },
    { width: 20 },
    { width: 20 },
    { width: 22 },
    { width: 3 },
  ]

  // fundo creme na área da capa
  for (let l = 1; l <= 44; l++) {
    const r = aba.getRow(l)
    for (let c = 1; c <= 6; c++) {
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREME } }
    }
  }

  // listras da marca no topo
  const topo = aba.getRow(1)
  topo.height = 10
  for (let c = 1; c <= 6; c++) {
    topo.getCell(c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: c % 2 ? AZUL : CREME },
    }
  }

  const logo = await imagemBase64('./loreta-wordmark.png')
  const boneca = await imagemBase64('./loreta-doll.png')
  if (logo) {
    const id = wb.addImage({ base64: logo, extension: 'png' })
    aba.addImage(id, { tl: { col: 1.1, row: 2.2 }, ext: { width: 250, height: 69 } })
  }
  if (boneca) {
    const id = wb.addImage({ base64: boneca, extension: 'png' })
    aba.addImage(id, { tl: { col: 4.2, row: 1.8 }, ext: { width: 118, height: 90 } })
  }
  for (let l = 2; l <= 6; l++) aba.getRow(l).height = 18

  const sub = aba.getCell('B8')
  sub.value = 'DOCERIA ARTESANAL · CONTROLE DO CAIXA'
  sub.font = { name: 'Calibri', bold: true, size: 10, color: { argb: VINHO_CLARO } }

  const quando = aba.getCell('B9')
  quando.value = `Relatório gerado em ${dataCurta(new Date().toISOString().slice(0, 10))}`
  quando.font = { name: 'Calibri', size: 10, italic: true, color: { argb: VINHO_CLARO } }

  const custos = mapaDeCustos(db)
  const res = resultado(db.vendas, custos, db.pontos, db.config)
  const cx = calcCaixa(db.vendas, db.despesas, db.retiradas, custos, db.pontos, db.config)
  const divisao = dividirLucro(res.lucro, db.config)
  const equilibrio = pontoEquilibrio(res, db.config)

  let linha = 11
  const bloco = (rotulo: string, valor: number | string, formato?: string, destaque = false) => {
    const r = aba.getRow(linha)
    r.height = destaque ? 26 : 21
    const a = r.getCell(2)
    a.value = rotulo
    a.font = {
      name: 'Calibri',
      bold: destaque,
      size: destaque ? 12 : 11,
      color: { argb: destaque ? VINHO : TINTA },
    }
    a.alignment = { vertical: 'middle' }
    aba.mergeCells(linha, 3, linha, 5)
    const b = r.getCell(3)
    b.value = valor as never
    if (formato) b.numFmt = formato
    b.font = {
      name: 'Calibri',
      bold: true,
      size: destaque ? 15 : 12,
      color: { argb: destaque ? VINHO : TINTA },
    }
    b.alignment = { vertical: 'middle', horizontal: 'right' }
    for (let c = 2; c <= 5; c++) {
      r.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: destaque ? CREME_2 : CREME },
      }
      r.getCell(c).border = {
        bottom: { style: 'thin', color: { argb: 'FFEADCD7' } },
      }
    }
    linha++
  }

  const secao = (texto: string) => {
    linha++
    const r = aba.getRow(linha)
    r.height = 22
    aba.mergeCells(linha, 2, linha, 5)
    const cel = r.getCell(2)
    cel.value = texto.toUpperCase()
    cel.font = { name: 'Calibri', bold: true, size: 10, color: { argb: CREME } }
    cel.alignment = { vertical: 'middle', indent: 1 }
    for (let c = 2; c <= 5; c++) {
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VINHO } }
    }
    linha++
  }

  secao('Caixa da Loreta')
  bloco('Dinheiro no caixa hoje', cx.saldo, MOEDA, true)
  bloco('Entrou de vendas', cx.entradas, MOEDA)
  bloco('Saiu em gastos', -cx.saidas, MOEDA)
  bloco('Retirado pela Julia', -cx.retiradas, MOEDA)

  secao('Resultado desde o começo')
  bloco('Faturamento', res.faturamento, MOEDA)
  bloco('Custo dos brownies (CMV)', -res.cmv, MOEDA)
  if (res.taxas > 0) bloco('Taxas dos pontos', -res.taxas, MOEDA)
  if (res.custosFixos > 0) bloco('Custos fixos', -res.custosFixos, MOEDA)
  bloco('Lucro', res.lucro, MOEDA, true)
  bloco('Margem', res.margemPct, PORCENTO)
  bloco('Brownies vendidos', res.unidades)
  bloco('Preço médio por brownie', res.precoMedio, MOEDA)
  bloco('Custo médio por brownie', res.custoMedio, MOEDA)

  secao('Divisão do lucro')
  bloco(`Julia · pró-labore (${db.config.splitJulia}%)`, divisao.julia, MOEDA, true)
  bloco(`Giro · repor insumos (${db.config.splitGiro}%)`, divisao.giro, MOEDA)
  bloco(`Reserva · crescimento (${db.config.splitReserva}%)`, divisao.reserva, MOEDA)
  bloco('A Julia ainda pode tirar', cx.disponivelJulia, MOEDA)

  if (db.config.custoFixoMensal > 0 && equilibrio.unidades > 0) {
    secao('Ponto de equilíbrio')
    bloco('Brownies por mês só pra empatar', equilibrio.unidades)
    bloco('Faturamento de equilíbrio', equilibrio.faturamento, MOEDA)
  }

  linha += 2
  aba.mergeCells(linha, 2, linha, 5)
  const rodape = aba.getRow(linha)
  rodape.height = 20
  const rc = rodape.getCell(2)
  rc.value = 'Loreta Doceria Artesanal · um cardápio pensado em você, personalizado por você ♡'
  rc.font = { name: 'Calibri', italic: true, size: 10, color: { argb: VINHO_CLARO } }
  rc.alignment = { vertical: 'middle', horizontal: 'center' }
  for (let c = 2; c <= 5; c++) {
    rodape.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PESSEGO } }
  }
}

/* ---------------------------------------------------------------
   Livro completo
   --------------------------------------------------------------- */

export async function gerarPlanilha(db: DB): Promise<Blob> {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Loreta Doceria Artesanal'
  wb.created = new Date()

  const custos = mapaDeCustos(db)
  const nomePonto = (id: string) => db.pontos.find((p) => p.id === id)?.nome ?? '—'
  const nomeSabor = (id: string) => db.sabores.find((s) => s.id === id)?.nome ?? '—'

  await abaResumo(wb, db)

  /* --- vendas --- */
  const vendas = wb.addWorksheet('Vendas', { properties: { tabColor: { argb: AZUL } } })
  titulo(vendas, 'Vendas por dia', 'Cada dia de venda em cada ponto', 7)
  tabela(
    vendas,
    [
      { titulo: 'Data', chave: 'data', largura: 12 },
      { titulo: 'Dia', chave: 'mes', largura: 18 },
      { titulo: 'Ponto de venda', chave: 'ponto', largura: 22 },
      { titulo: 'Faturamento', chave: 'fat', largura: 15, formato: MOEDA },
      { titulo: 'Brownies', chave: 'un', largura: 11 },
      { titulo: 'Custo', chave: 'custo', largura: 14, formato: MOEDA },
      { titulo: 'Sobra', chave: 'lucro', largura: 14, formato: MOEDA },
    ],
    [...db.vendas]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((v) => ({
        data: dataCurta(v.data),
        mes: nomeMes(v.data.slice(0, 7)),
        ponto: nomePonto(v.pontoId),
        fat: faturamentoVenda(v),
        un: unidadesVendidas(v),
        custo: cmvVenda(v, custos),
        lucro: faturamentoVenda(v) - cmvVenda(v, custos) - taxaVenda(v, db.pontos),
      })),
    4,
  )

  /* --- itens --- */
  const itens = wb.addWorksheet('Brownies vendidos', { properties: { tabColor: { argb: PESSEGO } } })
  titulo(itens, 'Brownies vendidos', 'Cada venda com o preço que saiu', 7)
  tabela(
    itens,
    [
      { titulo: 'Data', chave: 'data', largura: 12 },
      { titulo: 'Ponto de venda', chave: 'ponto', largura: 22 },
      { titulo: 'Sabor', chave: 'sabor', largura: 24 },
      { titulo: 'Preço', chave: 'preco', largura: 13, formato: MOEDA },
      { titulo: 'Qtd', chave: 'qtd', largura: 9 },
      { titulo: 'Total', chave: 'total', largura: 14, formato: MOEDA },
      { titulo: 'Lucro', chave: 'lucro', largura: 14, formato: MOEDA },
    ],
    [...db.vendas]
      .sort((a, b) => a.data.localeCompare(b.data))
      .flatMap((v) =>
        v.itens.map((i) => {
          const custo = custos.get(i.saborId)?.unitario ?? 0
          return {
            data: dataCurta(v.data),
            ponto: nomePonto(v.pontoId),
            sabor: nomeSabor(i.saborId),
            preco: i.preco,
            qtd: i.qtd,
            total: i.preco * i.qtd,
            lucro: (i.preco - custo) * i.qtd,
          }
        }),
      ),
    4,
  )

  /* --- pontos --- */
  const pontos = wb.addWorksheet('Pontos de venda', { properties: { tabColor: { argb: AZUL } } })
  titulo(pontos, 'Desempenho por ponto', 'Onde a Loreta vende melhor', 6)
  tabela(
    pontos,
    [
      { titulo: 'Ponto de venda', chave: 'nome', largura: 24 },
      { titulo: 'Dias', chave: 'dias', largura: 10 },
      { titulo: 'Brownies', chave: 'un', largura: 12 },
      { titulo: 'Faturamento', chave: 'fat', largura: 16, formato: MOEDA },
      { titulo: 'Média por dia', chave: 'media', largura: 16, formato: MOEDA },
      { titulo: 'Lucro', chave: 'lucro', largura: 15, formato: MOEDA },
    ],
    porPonto(db.vendas, db.pontos, custos).map((p) => ({
      nome: p.ponto.nome,
      dias: p.dias,
      un: p.unidades,
      fat: p.faturamento,
      media: p.dias ? p.faturamento / p.dias : 0,
      lucro: p.lucro,
    })),
    4,
  )

  /* --- sabores --- */
  const sabores = wb.addWorksheet('Sabores', { properties: { tabColor: { argb: PESSEGO } } })
  titulo(sabores, 'Desempenho por sabor', 'Quem vende mais e quem dá mais lucro', 6)
  tabela(
    sabores,
    [
      { titulo: 'Sabor', chave: 'nome', largura: 24 },
      { titulo: 'Vendidos', chave: 'un', largura: 12 },
      { titulo: 'Faturamento', chave: 'fat', largura: 16, formato: MOEDA },
      { titulo: 'Preço médio', chave: 'preco', largura: 15, formato: MOEDA },
      { titulo: 'Custo unit.', chave: 'custo', largura: 14, formato: MOEDA },
      { titulo: 'Lucro', chave: 'lucro', largura: 15, formato: MOEDA },
    ],
    porSabor(db.vendas, db.sabores, custos).map((s) => ({
      nome: s.sabor.nome,
      un: s.unidades,
      fat: s.faturamento,
      preco: s.precoMedio,
      custo: custos.get(s.sabor.id)?.unitario ?? 0,
      lucro: s.lucro,
    })),
    4,
  )

  /* --- custos dos sabores --- */
  const fichas = wb.addWorksheet('Custo dos brownies', { properties: { tabColor: { argb: VINHO } } })
  titulo(fichas, 'Ficha de custo', 'Quanto custa fazer cada brownie', 6)
  tabela(
    fichas,
    [
      { titulo: 'Sabor', chave: 'nome', largura: 24 },
      { titulo: 'Rende', chave: 'rende', largura: 10 },
      { titulo: 'Custo da fornada', chave: 'fornada', largura: 18, formato: MOEDA },
      { titulo: 'Custo por brownie', chave: 'unit', largura: 18, formato: MOEDA },
      { titulo: 'Preço de venda', chave: 'preco', largura: 16, formato: MOEDA },
      { titulo: 'Margem', chave: 'margem', largura: 12, formato: PORCENTO },
    ],
    db.sabores.map((s) => {
      const c = custoDoSabor(s, db.ingredientes)
      const preco = s.precoSugerido || precoSugerido(c.unitario, db.config.margemAlvo)
      return {
        nome: s.nome,
        rende: s.rendimento || '',
        fornada: c.fornada,
        unit: c.unitario,
        preco,
        margem: preco > 0 && c.unitario > 0 ? 1 - c.unitario / preco : 0,
      }
    }),
    4,
  )

  /* --- ingredientes --- */
  const ingredientes = wb.addWorksheet('Ingredientes', { properties: { tabColor: { argb: AZUL } } })
  titulo(ingredientes, 'Lista de compras', 'Preço de cada ingrediente', 5)
  tabela(
    ingredientes,
    [
      { titulo: 'Ingrediente', chave: 'nome', largura: 26 },
      { titulo: 'Preço do pacote', chave: 'pacote', largura: 18, formato: MOEDA },
      { titulo: 'Quantidade', chave: 'qtd', largura: 14 },
      { titulo: 'Unidade', chave: 'un', largura: 12 },
      { titulo: 'Custo por unidade', chave: 'unit', largura: 20, formato: 'R$ #,##0.0000' },
    ],
    db.ingredientes.map((i) => ({
      nome: i.nome,
      pacote: i.precoPacote,
      qtd: i.qtdPacote,
      un: i.unidade,
      unit: custoPorUnidadeBase(i),
    })),
    4,
  )

  /* --- gastos --- */
  const gastos = wb.addWorksheet('Gastos', { properties: { tabColor: { argb: 'FFB4443C' } } })
  titulo(gastos, 'Gastos', 'Tudo que saiu do caixa', 4)
  tabela(
    gastos,
    [
      { titulo: 'Data', chave: 'data', largura: 12 },
      { titulo: 'Categoria', chave: 'cat', largura: 18 },
      { titulo: 'Descrição', chave: 'desc', largura: 32 },
      { titulo: 'Valor', chave: 'valor', largura: 15, formato: MOEDA },
    ],
    [...db.despesas]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((d) => ({
        data: dataCurta(d.data),
        cat: d.categoria.charAt(0).toUpperCase() + d.categoria.slice(1),
        desc: d.descricao,
        valor: d.valor,
      })),
    4,
  )

  /* --- retiradas --- */
  const retiradas = wb.addWorksheet('Retiradas da Julia', {
    properties: { tabColor: { argb: PESSEGO } },
  })
  titulo(retiradas, 'Retiradas da Julia', 'O pró-labore da dona da Loreta', 3)
  tabela(
    retiradas,
    [
      { titulo: 'Data', chave: 'data', largura: 12 },
      { titulo: 'Observação', chave: 'obs', largura: 34 },
      { titulo: 'Valor', chave: 'valor', largura: 15, formato: MOEDA },
    ],
    [...db.retiradas]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((r) => ({ data: dataCurta(r.data), obs: r.obs || 'pró-labore', valor: r.valor })),
    4,
  )

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function baixarPlanilha(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Loreta-caixa-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
