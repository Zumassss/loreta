export const brl = (v: number) =>
  (isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })

/** R$ sem o símbolo, pra usar dentro de campos com prefixo */
export const num = (v: number, casas = 2) =>
  (isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })

export const pct = (v: number, casas = 0) =>
  `${(isFinite(v) ? v * 100 : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`

export const hoje = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export const mesDe = (iso: string) => iso.slice(0, 7)

export const mesAtual = () => hoje().slice(0, 7)

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export const nomeMes = (ym: string) => {
  const [a, m] = ym.split('-')
  return `${MESES[Number(m) - 1]} de ${a}`
}

/** só o nome do mês, com inicial maiúscula: "Setembro" */
export const soMes = (ym: string) => {
  const [, m] = ym.split('-')
  const n = MESES[Number(m) - 1]
  return n.charAt(0).toUpperCase() + n.slice(1)
}

export const nomeMesCurto = (ym: string) => {
  const [, m] = ym.split('-')
  return MESES[Number(m) - 1].slice(0, 3)
}

export const dataCurta = (iso: string) => {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a.slice(2)}`
}

export const diaSemana = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  return dias[new Date(a, m - 1, d).getDay()]
}

export const diaSemanaCurto = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
  return dias[new Date(a, m - 1, d).getDay()]
}

/** converte texto digitado ("12,50", "12.5", "R$ 12,50") em número */
export const paraNumero = (txt: string): number => {
  if (!txt) return 0
  const limpo = txt
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.')
  const n = parseFloat(limpo)
  return isFinite(n) ? n : 0
}

export const id = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
