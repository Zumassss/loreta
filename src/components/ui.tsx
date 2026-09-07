import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { IcCheck, IcMais, IcMenos, IcX } from './icons'
import { brl, num, paraNumero } from '../lib/format'

const semMovimento = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- Bonequinha da marca (com as pálpebras que piscam) ---------- */

export function Bonequinha({
  className = '',
  piscando = true,
  style,
}: {
  className?: string
  piscando?: boolean
  style?: CSSProperties
}) {
  return (
    <span className={`doll ${className}`} style={style} aria-hidden="true">
      <img src="./loreta-doll.png" alt="" />
      {piscando && (
        <>
          <i className="eyelid eyelid--l" />
          <i className="eyelid eyelid--r" />
        </>
      )}
    </span>
  )
}

/* ---------- Splash de entrada ---------- */

const CONFEITOS = [
  { e: '♡', x: 8, d: 0.2, s: 1 },
  { e: '✦', x: 22, d: 1.1, s: 0.8 },
  { e: '♡', x: 38, d: 0.6, s: 0.7 },
  { e: '✦', x: 55, d: 1.6, s: 1 },
  { e: '♡', x: 72, d: 0.35, s: 0.9 },
  { e: '✦', x: 86, d: 1.35, s: 0.75 },
  { e: '♡', x: 94, d: 0.85, s: 0.65 },
]

export function Splash({ aoTerminar }: { aoTerminar: () => void }) {
  useEffect(() => {
    const t = setTimeout(aoTerminar, semMovimento() ? 600 : 4200)
    return () => clearTimeout(t)
  }, [aoTerminar])

  return (
    <div className="splash" onClick={aoTerminar}>
      <div className="splash__confeitos" aria-hidden="true">
        {CONFEITOS.map((c, i) => (
          <span
            key={i}
            style={
              {
                left: `${c.x}%`,
                animationDelay: `${c.d}s`,
                fontSize: `${c.s * 20}px`,
              } as CSSProperties
            }
          >
            {c.e}
          </span>
        ))}
      </div>

      <div className="splash__inner">
        <div className="doll-wrap">
          <Bonequinha />
        </div>
        <img className="splash__word" src="./loreta-wordmark.png" alt="Loreta" />
        <div className="splash__tag">Doceria Artesanal</div>
        <div className="splash__hello">Oi, Julia! Vamos ver o caixa? ♡</div>
      </div>

      <div className="splash__cortina" aria-hidden="true" />
    </div>
  )
}

/* ---------- Número que sobe contando ---------- */

export function useContador(valor: number, ms = 750) {
  const [atual, setAtual] = useState(() => (semMovimento() ? valor : 0))
  const de = useRef(semMovimento() ? valor : 0)

  useEffect(() => {
    if (semMovimento()) {
      de.current = valor
      setAtual(valor)
      return
    }
    const inicio = de.current
    if (Math.abs(inicio - valor) < 0.005) {
      de.current = valor
      setAtual(valor)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const passo = (t: number) => {
      const p = Math.min((t - t0) / ms, 1)
      const suave = 1 - Math.pow(1 - p, 3)
      const v = inicio + (valor - inicio) * suave
      de.current = v
      setAtual(v)
      if (p < 1) raf = requestAnimationFrame(passo)
      else {
        de.current = valor
        setAtual(valor)
      }
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [valor, ms])

  return atual
}

export function Dinheiro({
  valor,
  className = 'money money--md',
  style,
}: {
  valor: number
  className?: string
  style?: CSSProperties
}) {
  const v = useContador(valor)
  return (
    <span className={className} style={style}>
      {brl(v)}
    </span>
  )
}

export function Numero({ valor, className }: { valor: number; className?: string }) {
  const v = useContador(valor, 600)
  return <span className={className}>{Math.round(v)}</span>
}

/* ---------- Chuvinha de confete ---------- */

const CORES = ['var(--wine)', 'var(--blue-ink)', 'var(--peach)', 'var(--blue)']

export function Confete({ semente }: { semente: number }) {
  const pedacos = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: (i * 37 + semente * 13) % 100,
        cor: CORES[i % CORES.length],
        atraso: ((i * 7) % 10) / 20,
        giro: ((i * 53) % 240) - 120,
        dur: 1.1 + (((i * 17) % 7) / 10),
        redondo: i % 3 === 0,
      })),
    [semente],
  )
  return (
    <div className="confete" aria-hidden="true">
      {pedacos.map((p, i) => (
        <i
          key={i}
          style={
            {
              left: `${p.left}%`,
              background: p.cor,
              animationDelay: `${p.atraso}s`,
              animationDuration: `${p.dur}s`,
              borderRadius: p.redondo ? '50%' : '2px',
              '--giro': `${p.giro}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/* ---------- Sheet ---------- */

/** quantos formulários estão abertos — a barra de baixo só volta no último */
let abertos = 0

function marcarAberto() {
  abertos += 1
  document.documentElement.dataset.sheet = 'aberto'
  return () => {
    abertos = Math.max(0, abertos - 1)
    if (abertos === 0) delete document.documentElement.dataset.sheet
  }
}

export function Sheet({
  aberto,
  titulo,
  subtitulo,
  aoFechar,
  children,
  rodape,
}: {
  aberto: boolean
  titulo: string
  subtitulo?: string
  aoFechar: () => void
  children: ReactNode
  rodape?: ReactNode
}) {
  const corpo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    const soltar = marcarAberto()
    return () => {
      window.removeEventListener('keydown', esc)
      soltar()
    }
  }, [aberto, aoFechar])

  // com o teclado aberto, garante que o campo focado fique visível
  useEffect(() => {
    if (!aberto) return
    const alvo = corpo.current
    if (!alvo) return
    const aoFocar = (e: FocusEvent) => {
      const campo = e.target as HTMLElement
      if (!campo?.closest?.('.sheet__body')) return
      // rola só o corpo do formulário — scrollIntoView() rolaria também a
      // casca do app e desalinharia a tela inteira
      setTimeout(() => {
        const c = campo.getBoundingClientRect()
        const b = alvo.getBoundingClientRect()
        const ajuste = c.top - b.top - (b.height - c.height) / 2
        if (Math.abs(ajuste) > 8)
          alvo.scrollTo({ top: alvo.scrollTop + ajuste, behavior: 'smooth' })
      }, 320)
    }
    alvo.addEventListener('focusin', aoFocar)
    return () => alvo.removeEventListener('focusin', aoFocar)
  }, [aberto])

  if (!aberto) return null
  return (
    <>
      <div className="sheet-backdrop" onClick={aoFechar} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="sheet__grab" />
        <div className="sheet__head">
          <div style={{ minWidth: 0 }}>
            <h2>{titulo}</h2>
            {subtitulo && <div className="muted">{subtitulo}</div>}
          </div>
          <button className="icon-btn" onClick={aoFechar} aria-label="Fechar">
            <IcX />
          </button>
        </div>
        <div className="sheet__body" ref={corpo}>
          {children}
        </div>
        {rodape && <div className="sheet__foot">{rodape}</div>}
      </div>
    </>
  )
}

/* ---------- Campo de dinheiro ---------- */

export function CampoDinheiro({
  valor,
  aoMudar,
  placeholder = '0,00',
  autoFoco,
}: {
  valor: number
  aoMudar: (v: number) => void
  placeholder?: string
  autoFoco?: boolean
}) {
  const [texto, setTexto] = useState(valor ? num(valor) : '')
  const focado = useRef(false)

  useEffect(() => {
    if (!focado.current) setTexto(valor ? num(valor) : '')
  }, [valor])

  return (
    <div className="money-input">
      <span className="money-input__prefix">R$</span>
      <input
        className="input"
        inputMode="decimal"
        autoFocus={autoFoco}
        placeholder={placeholder}
        value={texto}
        onFocus={(e) => {
          focado.current = true
          e.currentTarget.select()
        }}
        onChange={(e) => {
          setTexto(e.target.value)
          aoMudar(paraNumero(e.target.value))
        }}
        onBlur={() => {
          focado.current = false
          setTexto(valor ? num(valor) : '')
        }}
      />
    </div>
  )
}

/* ---------- Campo numérico simples ---------- */

export function CampoNumero({
  valor,
  aoMudar,
  sufixo,
  placeholder = '0',
  casas = 2,
}: {
  valor: number
  aoMudar: (v: number) => void
  sufixo?: string
  placeholder?: string
  casas?: number
}) {
  const [texto, setTexto] = useState(valor ? num(valor, casas) : '')
  const focado = useRef(false)
  useEffect(() => {
    if (!focado.current) setTexto(valor ? num(valor, casas) : '')
  }, [valor, casas])
  return (
    <div className="money-input">
      <input
        className="input"
        style={{ paddingLeft: 14, paddingRight: sufixo ? 46 : 14 }}
        inputMode="decimal"
        placeholder={placeholder}
        value={texto}
        onFocus={(e) => {
          focado.current = true
          e.currentTarget.select()
        }}
        onChange={(e) => {
          setTexto(e.target.value)
          aoMudar(paraNumero(e.target.value))
        }}
        onBlur={() => {
          focado.current = false
          setTexto(valor ? num(valor, casas) : '')
        }}
      />
      {sufixo && (
        <span className="money-input__prefix" style={{ left: 'auto', right: 14 }}>
          {sufixo}
        </span>
      )}
    </div>
  )
}

/* ---------- Stepper ---------- */

export function Contador({
  valor,
  aoMudar,
  min = 1,
}: {
  valor: number
  aoMudar: (v: number) => void
  min?: number
}) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => aoMudar(Math.max(min, valor - 1))} aria-label="Menos">
        <IcMenos />
      </button>
      <span>{valor}</span>
      <button type="button" onClick={() => aoMudar(valor + 1)} aria-label="Mais">
        <IcMais />
      </button>
    </div>
  )
}

/* ---------- Toast ---------- */

export function Toast({ texto }: { texto: string }) {
  return (
    <div className="toast">
      <IcCheck style={{ width: 18, height: 18 }} />
      {texto}
    </div>
  )
}

/* ---------- Vazio ---------- */

export function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="empty">
      <Bonequinha className="doll--vazio" />
      <h3 style={{ fontSize: 16 }}>{titulo}</h3>
      <p>{texto}</p>
    </div>
  )
}

/* ---------- Confirmação ---------- */

export function Confirmar({
  aberto,
  titulo,
  texto,
  aoConfirmar,
  aoFechar,
  rotulo = 'Apagar',
}: {
  aberto: boolean
  titulo: string
  texto: string
  aoConfirmar: () => void
  aoFechar: () => void
  rotulo?: string
}) {
  return (
    <Sheet
      aberto={aberto}
      titulo={titulo}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn btn--soft btn--block" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            className="btn btn--block"
            style={{ background: 'var(--alert)', borderColor: 'var(--alert)' }}
            onClick={() => {
              aoConfirmar()
              aoFechar()
            }}
          >
            {rotulo}
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: 14 }}>
        {texto}
      </p>
    </Sheet>
  )
}
