import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IcCheck, IcMais, IcMenos, IcX } from './icons'
import { num, paraNumero } from '../lib/format'

/* ---------- Splash de entrada ---------- */

export function Splash({ aoTerminar }: { aoTerminar: () => void }) {
  useEffect(() => {
    const t = setTimeout(aoTerminar, 3250)
    return () => clearTimeout(t)
  }, [aoTerminar])

  return (
    <div className="splash" onClick={aoTerminar}>
      <div className="splash__inner">
        <div className="doll-wrap">
          <img src="./loreta-doll.png" alt="Bonequinha da Loreta" />
          <span className="eyelid eyelid--l" />
          <span className="eyelid eyelid--r" />
        </div>
        <img className="splash__word" src="./loreta-wordmark.png" alt="Loreta" />
        <div className="splash__tag">Doceria Artesanal</div>
        <div className="splash__hello">Oi, Julia! Vamos ver o caixa? ♡</div>
      </div>
    </div>
  )
}

/* ---------- Sheet ---------- */

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
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, aoFechar])

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
            <IcX className="" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
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
        <IcMenos className="" />
      </button>
      <span>{valor}</span>
      <button type="button" onClick={() => aoMudar(valor + 1)} aria-label="Mais">
        <IcMais className="" />
      </button>
    </div>
  )
}

/* ---------- Toast ---------- */

export function Toast({ texto }: { texto: string }) {
  return (
    <div className="toast">
      <IcCheck className="" style={{ width: 18, height: 18 }} />
      {texto}
    </div>
  )
}

/* ---------- Vazio ---------- */

export function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="empty">
      <img src="./loreta-doll.png" alt="" />
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
