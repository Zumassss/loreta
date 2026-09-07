import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import type { ItemVenda, Venda } from '../lib/types'
import {
  brl,
  dataCurta,
  diaSemana,
  diaSemanaCurto,
  hoje,
  id as novoId,
  mesAtual,
  mesDe,
  soMes,
} from '../lib/format'
import {
  cmvVenda,
  divergencia,
  faturamentoVenda,
  mapaDeCustos,
  unidadesVendidas,
} from '../lib/finance'
import { CampoDinheiro, Confirmar, Contador, Sheet, Vazio } from '../components/ui'
import { IcLixo, IcMais, IcSacola } from '../components/icons'

type Rascunho = {
  data: string
  pontoId: string
  totalInformado: number
  itens: ItemVenda[]
  obs: string
}

const vazio = (pontoId: string): Rascunho => ({
  data: hoje(),
  pontoId,
  totalInformado: 0,
  itens: [],
  obs: '',
})

export default function Vendas({ avisar }: { avisar: (t: string) => void }) {
  const { db, set } = useStore()
  const custos = useMemo(() => mapaDeCustos(db), [db])
  const pontosAtivos = db.pontos.filter((p) => p.ativo)
  const saboresAtivos = db.sabores.filter((s) => s.ativo)

  const [form, setForm] = useState<Rascunho | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<Venda | null>(null)
  const [apagar, setApagar] = useState<string | null>(null)

  const mes = mesAtual()
  const doMes = db.vendas.filter((v) => mesDe(v.data) === mes)
  const faturamentoMes = doMes.reduce((s, v) => s + faturamentoVenda(v), 0)
  const unidadesMes = doMes.reduce((s, v) => s + unidadesVendidas(v), 0)

  const ordenadas = [...db.vendas].sort(
    (a, b) => b.data.localeCompare(a.data) || b.criadoEm - a.criadoEm,
  )

  const nomePonto = (pid: string) => db.pontos.find((p) => p.id === pid)?.nome ?? 'Ponto removido'
  const nomeSabor = (sid: string) => db.sabores.find((s) => s.id === sid)?.nome ?? 'Sabor removido'

  const abrirNova = () => {
    setEditando(null)
    setForm(vazio(pontosAtivos[0]?.id ?? ''))
  }

  const abrirEdicao = (v: Venda) => {
    setDetalhe(null)
    setEditando(v.id)
    setForm({
      data: v.data,
      pontoId: v.pontoId,
      totalInformado: v.totalInformado,
      itens: v.itens.map((i) => ({ ...i })),
      obs: v.obs ?? '',
    })
  }

  const salvar = () => {
    if (!form || !form.pontoId) return
    const itens = form.itens.filter((i) => i.saborId && i.qtd > 0)
    const total = form.totalInformado > 0 ? form.totalInformado : itens.reduce((s, i) => s + i.preco * i.qtd, 0)
    if (total <= 0 && itens.length === 0) return

    set((d) => {
      if (editando) {
        return {
          ...d,
          vendas: d.vendas.map((v) =>
            v.id === editando
              ? { ...v, data: form.data, pontoId: form.pontoId, totalInformado: total, itens, obs: form.obs }
              : v,
          ),
        }
      }
      const nova: Venda = {
        id: novoId(),
        data: form.data,
        pontoId: form.pontoId,
        totalInformado: total,
        itens,
        obs: form.obs,
        criadoEm: Date.now(),
      }
      return { ...d, vendas: [nova, ...d.vendas] }
    })
    avisar(editando ? 'Venda atualizada ♡' : 'Venda registrada ♡')
    setForm(null)
    setEditando(null)
  }

  const somaItens = form ? form.itens.reduce((s, i) => s + i.preco * i.qtd, 0) : 0
  const dif = form && form.totalInformado > 0 ? form.totalInformado - somaItens : 0

  return (
    <>
      <div className="stack">
        <div className="card card--tint">
          <div className="row row--between">
            <div>
              <div className="label">Faturamento de {soMes(mes)}</div>
              <div className="money money--lg">{brl(faturamentoMes)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label">Brownies</div>
              <div className="money money--md">{unidadesMes}</div>
            </div>
          </div>
          <div className="divider" />
          <div className="muted">
            {doMes.length === 0
              ? 'Nenhum dia de venda lançado neste mês ainda.'
              : `${doMes.length} ${doMes.length === 1 ? 'dia lançado' : 'dias lançados'} neste mês`}
          </div>
        </div>

        <div className="section-title">
          <h2>Histórico</h2>
        </div>

        {ordenadas.length === 0 ? (
          <Vazio
            titulo="Nada por aqui ainda"
            texto="Toque em “Nova venda” pra lançar o quanto a Loreta faturou hoje."
          />
        ) : (
          <div className="list">
            {ordenadas.map((v) => {
              const lucro = faturamentoVenda(v) - cmvVenda(v, custos)
              return (
                <button key={v.id} className="item" onClick={() => setDetalhe(v)}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: 'var(--blue-pale)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--wine)',
                      flex: '0 0 auto',
                    }}
                  >
                    <IcSacola style={{ width: 20, height: 20 }} />
                  </div>
                  <div className="item__main">
                    <div className="item__title">{nomePonto(v.pontoId)}</div>
                    <div className="item__sub">
                      {dataCurta(v.data)} · {diaSemanaCurto(v.data)} ·{' '}
                      {unidadesVendidas(v) > 0 ? `${unidadesVendidas(v)} un` : 'sem itens'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="money money--md">{brl(faturamentoVenda(v))}</div>
                    {custosPreenchidos(v, custos) && (
                      <div className="muted" style={{ fontSize: 11 }}>
                        lucro {brl(lucro)}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button className="fab" onClick={abrirNova}>
        <IcMais style={{ width: 20, height: 20 }} />
        Nova venda
      </button>

      {/* ---------- Detalhe ---------- */}
      <Sheet
        aberto={!!detalhe}
        titulo={detalhe ? nomePonto(detalhe.pontoId) : ''}
        subtitulo={detalhe ? `${dataCurta(detalhe.data)} · ${diaSemana(detalhe.data)}` : ''}
        aoFechar={() => setDetalhe(null)}
        rodape={
          detalhe ? (
            <>
              <button
                className="btn btn--soft btn--block"
                onClick={() => {
                  setApagar(detalhe.id)
                  setDetalhe(null)
                }}
              >
                Apagar
              </button>
              <button className="btn btn--block" onClick={() => abrirEdicao(detalhe)}>
                Editar
              </button>
            </>
          ) : undefined
        }
      >
        {detalhe && (
          <div className="stack">
            <div className="card card--tint">
              <div className="row row--between">
                <span className="label">Faturamento do dia</span>
                <span className="money money--md">{brl(faturamentoVenda(detalhe))}</span>
              </div>
              {custosPreenchidos(detalhe, custos) && (
                <>
                  <div className="divider" />
                  <div className="row row--between">
                    <span className="muted">Custo dos brownies</span>
                    <span style={{ fontWeight: 700 }}>− {brl(cmvVenda(detalhe, custos))}</span>
                  </div>
                  <div className="row row--between" style={{ marginTop: 4 }}>
                    <span className="muted">Sobrou</span>
                    <span className="money money--md pos">
                      {brl(faturamentoVenda(detalhe) - cmvVenda(detalhe, custos))}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="section-title">
              <h2>Brownies vendidos</h2>
            </div>
            {detalhe.itens.length === 0 ? (
              <p className="muted">Nenhum brownie detalhado nesse dia.</p>
            ) : (
              <div className="list">
                {detalhe.itens.map((i) => (
                  <div key={i.id} className="item">
                    <div className="item__main">
                      <div className="item__title">{nomeSabor(i.saborId)}</div>
                      <div className="item__sub">
                        {i.qtd} × {brl(i.preco)}
                      </div>
                    </div>
                    <div className="money money--md">{brl(i.preco * i.qtd)}</div>
                  </div>
                ))}
              </div>
            )}
            {divergencia(detalhe) !== 0 && detalhe.itens.length > 0 && (
              <p className="muted">
                {divergencia(detalhe) > 0
                  ? `Faltam ${brl(divergencia(detalhe))} em brownies detalhados nesse dia.`
                  : `Os brownies somam ${brl(-divergencia(detalhe))} a mais que o total informado.`}
              </p>
            )}
            {detalhe.obs && (
              <div className="card card--flat">
                <div className="label">Observação</div>
                <p style={{ margin: '4px 0 0', fontSize: 14 }}>{detalhe.obs}</p>
              </div>
            )}
          </div>
        )}
      </Sheet>

      {/* ---------- Nova / editar ---------- */}
      <Sheet
        aberto={!!form}
        titulo={editando ? 'Editar venda' : 'Nova venda'}
        subtitulo="Onde vendeu, quanto entrou e quais brownies saíram"
        aoFechar={() => {
          setForm(null)
          setEditando(null)
        }}
        rodape={
          <>
            <button
              className="btn btn--soft"
              onClick={() => {
                setForm(null)
                setEditando(null)
              }}
            >
              Cancelar
            </button>
            <button
              className="btn btn--block"
              onClick={salvar}
              disabled={!form?.pontoId || (form.totalInformado <= 0 && somaItens <= 0)}
            >
              Salvar venda
            </button>
          </>
        }
      >
        {form && (
          <div className="stack">
            <div className="field">
              <span className="label">Ponto de venda</span>
              <div className="chips">
                {pontosAtivos.map((p) => (
                  <button
                    key={p.id}
                    className={`chip${form.pontoId === p.id ? ' is-on' : ''}`}
                    onClick={() => setForm({ ...form, pontoId: p.id })}
                  >
                    {p.nome}
                  </button>
                ))}
              </div>
              {pontosAtivos.length === 0 && (
                <p className="muted">Cadastre um ponto de venda em Ajustes.</p>
              )}
            </div>

            <div className="grid-2">
              <div className="field">
                <span className="label">Data</span>
                <input
                  className="input"
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                />
              </div>
              <div className="field">
                <span className="label">Faturamento do dia</span>
                <CampoDinheiro
                  valor={form.totalInformado}
                  aoMudar={(v) => setForm({ ...form, totalInformado: v })}
                />
              </div>
            </div>

            <div className="section-title">
              <h2>Brownies vendidos</h2>
            </div>
            <p className="muted" style={{ marginTop: -4 }}>
              Lance cada venda com o preço que saiu. Vendeu o mesmo sabor por preços
              diferentes? É só adicionar outra linha.
            </p>

            <div className="list">
              {form.itens.map((item, idx) => (
                <div key={item.id} className="card card--flat pop" style={{ padding: 12 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <select
                      className="select"
                      value={item.saborId}
                      onChange={(e) => {
                        const itens = [...form.itens]
                        itens[idx] = { ...item, saborId: e.target.value }
                        setForm({ ...form, itens })
                      }}
                    >
                      {saboresAtivos.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      className="icon-btn"
                      aria-label="Remover"
                      onClick={() =>
                        setForm({ ...form, itens: form.itens.filter((x) => x.id !== item.id) })
                      }
                    >
                      <IcLixo style={{ width: 17, height: 17 }} />
                    </button>
                  </div>
                  <div className="row" style={{ marginTop: 10, gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <CampoDinheiro
                        valor={item.preco}
                        aoMudar={(v) => {
                          const itens = [...form.itens]
                          itens[idx] = { ...item, preco: v }
                          setForm({ ...form, itens })
                        }}
                      />
                    </div>
                    <Contador
                      valor={item.qtd}
                      aoMudar={(v) => {
                        const itens = [...form.itens]
                        itens[idx] = { ...item, qtd: v }
                        setForm({ ...form, itens })
                      }}
                    />
                  </div>
                  <div className="muted" style={{ marginTop: 8, textAlign: 'right' }}>
                    subtotal <b style={{ color: 'var(--wine)' }}>{brl(item.preco * item.qtd)}</b>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn--soft btn--block"
              onClick={() =>
                setForm({
                  ...form,
                  itens: [
                    ...form.itens,
                    {
                      id: novoId(),
                      saborId: saboresAtivos[0]?.id ?? '',
                      preco: ultimoPreco(db.vendas, saboresAtivos[0]?.id ?? ''),
                      qtd: 1,
                    },
                  ],
                })
              }
              disabled={saboresAtivos.length === 0}
            >
              <IcMais style={{ width: 18, height: 18 }} />
              Adicionar brownie
            </button>

            {form.itens.length > 0 && (
              <div className="card card--tint">
                <div className="row row--between">
                  <span className="muted">Somando os brownies</span>
                  <span className="money money--md">{brl(somaItens)}</span>
                </div>
                {form.totalInformado > 0 && (
                  <>
                    <div className="divider" />
                    <div className="row row--between">
                      <span className="muted">Total informado do dia</span>
                      <span style={{ fontWeight: 700 }}>{brl(form.totalInformado)}</span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {Math.abs(dif) < 0.005 ? (
                        <span className="tag tag--ok">tudo batendo certinho ♡</span>
                      ) : dif > 0 ? (
                        <span className="tag tag--peach">faltam {brl(dif)} em brownies</span>
                      ) : (
                        <span className="tag tag--alert">
                          {brl(-dif)} a mais que o total informado
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="field">
              <span className="label">Observação (opcional)</span>
              <textarea
                className="input"
                rows={2}
                placeholder="Ex: dia de chuva, vendi menos"
                value={form.obs}
                onChange={(e) => setForm({ ...form, obs: e.target.value })}
              />
            </div>
          </div>
        )}
      </Sheet>

      <Confirmar
        aberto={!!apagar}
        titulo="Apagar essa venda?"
        texto="O valor sai do caixa e dos relatórios. Não dá pra desfazer."
        aoFechar={() => setApagar(null)}
        aoConfirmar={() => {
          set((d) => ({ ...d, vendas: d.vendas.filter((v) => v.id !== apagar) }))
          avisar('Venda apagada')
        }}
      />
    </>
  )
}

function custosPreenchidos(v: Venda, custos: ReturnType<typeof mapaDeCustos>) {
  return v.itens.length > 0 && v.itens.every((i) => (custos.get(i.saborId)?.unitario ?? 0) > 0)
}

/** repete o último preço praticado daquele sabor pra agilizar o lançamento */
function ultimoPreco(vendas: Venda[], saborId: string): number {
  for (const v of [...vendas].sort((a, b) => b.criadoEm - a.criadoEm))
    for (const i of v.itens) if (i.saborId === saborId) return i.preco
  return 0
}
