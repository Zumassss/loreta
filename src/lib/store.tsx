import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { DB } from './types'
import { id } from './format'

const CHAVE = 'loreta.caixa.v1'

const semente = (): DB => ({
  versao: 1,
  pontos: [
    'Ufes',
    'Farmacro',
    'Uvv Noite',
    'Uvv Dia',
    'Clínica Fono',
    'Amigas Laura',
    'Vendas Marcelo',
  ].map((nome) => ({ id: id(), nome, ativo: true, taxaPct: 0 })),
  sabores: [
    'Ninho com Nutella',
    'Snickers',
    'Maracujá',
    'Tradicional',
    'Doce de Leite',
  ].map((nome) => ({
    id: id(),
    nome,
    ativo: true,
    rendimento: 0,
    itens: [],
    extras: [],
  })),
  ingredientes: [],
  vendas: [],
  despesas: [],
  retiradas: [],
  config: {
    splitJulia: 60,
    splitGiro: 25,
    splitReserva: 15,
    metaMensal: 0,
    custoFixoMensal: 0,
    margemAlvo: 0.6,
  },
})

function carregar(): DB {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return semente()
    const dado = JSON.parse(bruto) as DB
    const base = semente()
    // mescla defensiva: se faltar campo novo, usa o da semente
    return {
      ...base,
      ...dado,
      config: { ...base.config, ...(dado.config || {}) },
      pontos: dado.pontos?.length ? dado.pontos : base.pontos,
      sabores: dado.sabores?.length ? dado.sabores : base.sabores,
      ingredientes: dado.ingredientes ?? [],
      vendas: dado.vendas ?? [],
      despesas: dado.despesas ?? [],
      retiradas: dado.retiradas ?? [],
    }
  } catch {
    return semente()
  }
}

interface Ctx {
  db: DB
  set: (fn: (atual: DB) => DB) => void
  reset: () => void
  importar: (json: string) => boolean
  exportar: () => string
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(carregar)
  const primeiro = useRef(true)

  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false
      return
    }
    try {
      localStorage.setItem(CHAVE, JSON.stringify(db))
    } catch {
      /* espaço cheio ou modo privado — segue sem travar o app */
    }
  }, [db])

  const set = useCallback((fn: (atual: DB) => DB) => setDb((a) => fn(a)), [])

  const reset = useCallback(() => {
    const novo = semente()
    setDb(novo)
    try {
      localStorage.setItem(CHAVE, JSON.stringify(novo))
    } catch {
      /* ignore */
    }
  }, [])

  const exportar = useCallback(() => JSON.stringify(db, null, 2), [db])

  const importar = useCallback((json: string) => {
    try {
      const dado = JSON.parse(json) as DB
      if (!dado || typeof dado !== 'object' || !Array.isArray(dado.pontos)) return false
      const base = semente()
      setDb({
        ...base,
        ...dado,
        config: { ...base.config, ...(dado.config || {}) },
      })
      return true
    } catch {
      return false
    }
  }, [])

  const valor = useMemo(
    () => ({ db, set, reset, importar, exportar }),
    [db, set, reset, importar, exportar],
  )

  return <StoreCtx.Provider value={valor}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore precisa estar dentro de StoreProvider')
  return ctx
}
