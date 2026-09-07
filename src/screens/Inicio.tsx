import { useMemo } from 'react'
import { useStore } from '../lib/store'
import type { Aba } from '../App'
import { brl, mesAtual, mesDe, nomeMes, nomeMesCurto, pct } from '../lib/format'
import {
  caixa as calcCaixa,
  dividirLucro,
  mapaDeCustos,
  porPonto,
  porSabor,
  resultado,
  seriePorMes,
} from '../lib/finance'
import { IcAlerta, IcEstrela, IcMais, IcSeta } from '../components/icons'

export default function Inicio({ irPara }: { irPara: (a: Aba) => void }) {
  const { db } = useStore()
  const custos = useMemo(() => mapaDeCustos(db), [db])

  const mes = mesAtual()
  const doMes = db.vendas.filter((v) => mesDe(v.data) === mes)
  const despesasMes = db.despesas.filter((d) => mesDe(d.data) === mes)

  const resMes = resultado(doMes, custos, db.pontos, db.config, doMes.length ? 1 : 0)
  const resTudo = resultado(db.vendas, custos, db.pontos, db.config)
  const cx = calcCaixa(db.vendas, db.despesas, db.retiradas, custos, db.pontos, db.config)
  const divisaoMes = dividirLucro(resMes.lucro, db.config)

  const serie = seriePorMes(db.vendas, 6)
  const maxSerie = Math.max(...serie.map((s) => s.total), 1)
  const ranking = porPonto(doMes, db.pontos, custos).slice(0, 3)
  const sabores = porSabor(doMes, db.sabores, custos).slice(0, 3)

  const semVendas = db.vendas.length === 0
  const semCustos = db.sabores.every((s) => (custos.get(s.id)?.unitario ?? 0) <= 0)
  const metaPct = db.config.metaMensal > 0 ? resMes.faturamento / db.config.metaMensal : 0

  return (
    <div className="stack">
      {/* ---------- caixa ---------- */}
      <section className="hero">
        <div className="hero__stripes" />
        <div className="hero__body" style={{ position: 'relative' }}>
          <img className="hero__doll" src="./loreta-doll.png" alt="" />
          <div className="label">Caixa da Loreta</div>
          <div className={`money money--xl${cx.saldo < 0 ? ' neg' : ''}`}>{brl(cx.saldo)}</div>
          <div className="muted" style={{ maxWidth: '68%' }}>
            {semVendas
              ? 'Assim que você lançar a primeira venda, o caixa aparece aqui.'
              : `${brl(cx.entradas)} entraram · ${brl(cx.saidas + cx.retiradas)} saíram`}
          </div>
        </div>
      </section>

      {/* ---------- mês ---------- */}
      <div className="grid-2">
        <div className="card">
          <div className="label">Faturou em {nomeMesCurto(mes)}</div>
          <div className="money money--lg">{brl(resMes.faturamento)}</div>
          <div className="muted">{resMes.unidades} brownies</div>
        </div>
        <div className="card">
          <div className="label">Lucro de {nomeMesCurto(mes)}</div>
          <div className={`money money--lg${resMes.lucro < 0 ? ' neg' : ''}`}>
            {brl(resMes.lucro)}
          </div>
          <div className="muted">
            {resMes.faturamento > 0 ? `${pct(resMes.margemPct)} de margem` : 'sem vendas ainda'}
          </div>
        </div>
      </div>

      {/* ---------- alerta de custo ---------- */}
      {semCustos && !semVendas && (
        <button className="card" style={{ background: 'var(--peach-pale)', borderColor: '#d9a460', textAlign: 'left' }} onClick={() => irPara('custos')}>
          <div className="row" style={{ gap: 10 }}>
            <IcAlerta style={{ width: 22, height: 22, color: '#8a5a1c', flex: '0 0 auto' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#8a5a1c', fontSize: 14 }}>
                Falta cadastrar o custo dos brownies
              </div>
              <div className="muted" style={{ color: '#9a6b31' }}>
                Sem isso o lucro fica otimista demais. Toque pra preencher.
              </div>
            </div>
            <IcSeta style={{ width: 18, height: 18, color: '#8a5a1c' }} />
          </div>
        </button>
      )}

      {/* ---------- Julia ---------- */}
      <section className="card">
        <div className="row row--between">
          <div>
            <div className="label">A Julia pode tirar</div>
            <div className="money money--lg">{brl(cx.disponivelJulia)}</div>
          </div>
          <button className="icon-btn" onClick={() => irPara('caixa')} aria-label="Ir para o caixa">
            <IcSeta style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div className="divider" />
        <div className="muted">
          {db.config.splitJulia}% do lucro é da Julia · {db.config.splitGiro}% volta pro giro ·{' '}
          {db.config.splitReserva}% vai pra reserva
        </div>
        {resMes.lucro > 0 && (
          <div className="bar" style={{ marginTop: 10 }}>
            <span style={{ width: `${db.config.splitJulia}%`, background: 'var(--wine)' }} />
            <span style={{ width: `${db.config.splitGiro}%`, background: 'var(--blue-ink)' }} />
            <span style={{ width: `${db.config.splitReserva}%`, background: 'var(--peach)' }} />
          </div>
        )}
        {resMes.lucro > 0 && (
          <div className="muted" style={{ marginTop: 8 }}>
            Do lucro deste mês: <b style={{ color: 'var(--wine)' }}>{brl(divisaoMes.julia)}</b> pra
            Julia, {brl(divisaoMes.giro)} pro giro e {brl(divisaoMes.reserva)} pra reserva.
          </div>
        )}
      </section>

      {/* ---------- meta ---------- */}
      {db.config.metaMensal > 0 && (
        <section className="card card--tint">
          <div className="row row--between">
            <span className="label">Meta de {nomeMes(mes)}</span>
            <span className="tag">{pct(Math.min(metaPct, 1))}</span>
          </div>
          <div className="bar" style={{ marginTop: 10, height: 14 }}>
            <span
              style={{
                width: `${Math.min(metaPct, 1) * 100}%`,
                background: 'linear-gradient(90deg, var(--blue-ink), var(--wine))',
                transition: 'width .5s cubic-bezier(.22,1,.36,1)',
              }}
            />
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            {metaPct >= 1
              ? 'Meta batida! Que orgulho ♡'
              : `Faltam ${brl(db.config.metaMensal - resMes.faturamento)} pra bater a meta.`}
          </div>
        </section>
      )}

      {/* ---------- histórico ---------- */}
      {!semVendas && (
        <section className="card">
          <div className="label" style={{ marginBottom: 10 }}>
            Últimos 6 meses
          </div>
          <div className="mini-bars">
            {serie.map((s) => (
              <div key={s.ym}>
                <i style={{ height: `${Math.max((s.total / maxSerie) * 100, 3)}%` }} />
                <b>{nomeMesCurto(s.ym)}</b>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="row row--between">
            <span className="muted">Total já faturado</span>
            <span className="money money--md">{brl(resTudo.faturamento)}</span>
          </div>
        </section>
      )}

      {/* ---------- rankings ---------- */}
      {ranking.length > 0 && (
        <>
          <div className="section-title">
            <h2>Onde vendeu mais</h2>
          </div>
          <div className="list">
            {ranking.map((r, i) => (
              <div key={r.ponto.id} className="item">
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: i === 0 ? 'var(--peach)' : 'var(--blue-pale)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    color: 'var(--wine)',
                    fontSize: 13,
                    flex: '0 0 auto',
                  }}
                >
                  {i + 1}
                </div>
                <div className="item__main">
                  <div className="item__title">{r.ponto.nome}</div>
                  <div className="item__sub">
                    {r.dias} {r.dias === 1 ? 'dia' : 'dias'} · {r.unidades} brownies
                  </div>
                </div>
                <div className="money money--md">{brl(r.faturamento)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {sabores.length > 0 && (
        <>
          <div className="section-title">
            <h2>Queridinhos do mês</h2>
          </div>
          <div className="list">
            {sabores.map((s, i) => (
              <div key={s.sabor.id} className="item">
                <IcEstrela
                  style={{
                    width: 20,
                    height: 20,
                    color: i === 0 ? '#d9a460' : 'var(--blue-ink)',
                    flex: '0 0 auto',
                  }}
                />
                <div className="item__main">
                  <div className="item__title">{s.sabor.nome}</div>
                  <div className="item__sub">
                    {s.unidades} vendidos · preço médio {brl(s.precoMedio)}
                  </div>
                </div>
                <div className="money money--md">{brl(s.faturamento)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {despesasMes.length > 0 && (
        <div className="card card--flat">
          <div className="row row--between">
            <span className="muted">Gastos lançados em {nomeMesCurto(mes)}</span>
            <span className="money money--md neg">
              {brl(despesasMes.reduce((s, d) => s + d.valor, 0))}
            </span>
          </div>
        </div>
      )}

      <button className="btn btn--block" onClick={() => irPara('vendas')}>
        <IcMais style={{ width: 20, height: 20 }} />
        Lançar uma venda
      </button>

      <p className="muted" style={{ textAlign: 'center', padding: '4px 20px 0' }}>
        Feito com carinho pra Julia Pótico ♡
      </p>
    </div>
  )
}
