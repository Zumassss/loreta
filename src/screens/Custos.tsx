import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import type { Ingrediente, Sabor, Unidade } from '../lib/types'
import { brl, id as novoId, num, pct } from '../lib/format'
import {
  custoDoSabor,
  custoIngredienteNaReceita,
  custoPorUnidadeBase,
  mapaDeCustos,
  precoSugerido,
} from '../lib/finance'
import { CampoDinheiro, CampoNumero, Confirmar, Sheet, Vazio } from '../components/ui'
import { IcBolo, IcCarrinho, IcLixo, IcMais, IcSeta } from '../components/icons'

const UNIDADES: Unidade[] = ['g', 'kg', 'ml', 'L', 'un']

export default function Custos({ avisar }: { avisar: (t: string) => void }) {
  const { db, set } = useStore()
  const custos = useMemo(() => mapaDeCustos(db), [db])
  const [visao, setVisao] = useState<'sabores' | 'ingredientes'>('sabores')

  const [saborAberto, setSaborAberto] = useState<Sabor | null>(null)
  const [ingAberto, setIngAberto] = useState<Ingrediente | null>(null)
  const [apagarIng, setApagarIng] = useState<string | null>(null)

  const salvarSabor = (s: Sabor) => {
    set((d) => ({ ...d, sabores: d.sabores.map((x) => (x.id === s.id ? s : x)) }))
    setSaborAberto(null)
    avisar('Receita salva!')
  }

  const salvarIngrediente = (i: Ingrediente) => {
    set((d) => ({
      ...d,
      ingredientes: d.ingredientes.some((x) => x.id === i.id)
        ? d.ingredientes.map((x) => (x.id === i.id ? i : x))
        : [...d.ingredientes, i],
    }))
    setIngAberto(null)
    avisar('Ingrediente salvo!')
  }

  return (
    <>
      <div className="stack">
        <div className="chips" style={{ gap: 8 }}>
          <button
            className={`chip chip--blue${visao === 'sabores' ? ' is-on' : ''}`}
            onClick={() => setVisao('sabores')}
          >
            <IcBolo style={{ width: 16, height: 16 }} /> Sabores
          </button>
          <button
            className={`chip chip--blue${visao === 'ingredientes' ? ' is-on' : ''}`}
            onClick={() => setVisao('ingredientes')}
          >
            <IcCarrinho style={{ width: 16, height: 16 }} /> Ingredientes
          </button>
        </div>

        {visao === 'sabores' ? (
          <>
            <div className="card card--tint">
              <div className="label">Como funciona</div>
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                Cadastre os ingredientes com o preço do pacote. Depois monte a receita de cada
                sabor dizendo quanto usa de cada coisa e quantos brownies a fornada rende. A
                Loreta calcula o custo de cada brownie sozinha.
              </p>
            </div>

            <div className="section-title">
              <h2>Sabores</h2>
            </div>

            <div className="list">
              {db.sabores.map((s) => {
                const c = custos.get(s.id)!
                const sugerido = precoSugerido(c.unitario, db.config.margemAlvo)
                return (
                  <button key={s.id} className="item" onClick={() => setSaborAberto(s)}>
                    <div className="item__main">
                      <div className="item__title">{s.nome}</div>
                      <div className="item__sub">
                        {c.vazio
                          ? 'custo ainda não cadastrado'
                          : `custo ${brl(c.unitario)} · vender por ${brl(
                              s.precoSugerido || sugerido,
                            )}`}
                      </div>
                    </div>
                    {c.vazio ? (
                      <span className="tag tag--peach">preencher</span>
                    ) : (
                      <span className="tag tag--ok">
                        {pct(1 - c.unitario / (s.precoSugerido || sugerido || 1))}
                      </span>
                    )}
                    <IcSeta style={{ width: 16, height: 16, color: 'var(--wine-soft)' }} />
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div className="section-title">
              <h2>Ingredientes</h2>
            </div>
            {db.ingredientes.length === 0 ? (
              <Vazio
                titulo="Nenhum ingrediente ainda"
                texto="Adicione farinha, chocolate, ovos… com o preço do pacote que você compra."
              />
            ) : (
              <div className="list">
                {db.ingredientes.map((i) => (
                  <button key={i.id} className="item" onClick={() => setIngAberto(i)}>
                    <div className="item__main">
                      <div className="item__title">{i.nome}</div>
                      <div className="item__sub">
                        {brl(i.precoPacote)} · {num(i.qtdPacote, 0)}
                        {i.unidade}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="money money--md">
                        {brl(custoPorUnidadeBase(i) * (i.unidade === 'un' ? 1 : 100))}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        por {i.unidade === 'un' ? 'unidade' : i.unidade === 'ml' || i.unidade === 'L' ? '100ml' : '100g'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {visao === 'ingredientes' && (
        <button
          className="fab"
          onClick={() =>
            setIngAberto({
              id: novoId(),
              nome: '',
              precoPacote: 0,
              qtdPacote: 0,
              unidade: 'g',
            })
          }
        >
          <IcMais style={{ width: 20, height: 20 }} />
          Ingrediente
        </button>
      )}

      {saborAberto && (
        <EditorSabor
          sabor={saborAberto}
          ingredientes={db.ingredientes}
          margemAlvo={db.config.margemAlvo}
          aoFechar={() => setSaborAberto(null)}
          aoSalvar={salvarSabor}
        />
      )}

      {ingAberto && (
        <EditorIngrediente
          ingrediente={ingAberto}
          existe={db.ingredientes.some((x) => x.id === ingAberto.id)}
          aoFechar={() => setIngAberto(null)}
          aoSalvar={salvarIngrediente}
          aoApagar={() => {
            setApagarIng(ingAberto.id)
            setIngAberto(null)
          }}
        />
      )}

      <Confirmar
        aberto={!!apagarIng}
        titulo="Apagar ingrediente?"
        texto="Ele sai das receitas que estiverem usando ele."
        aoFechar={() => setApagarIng(null)}
        aoConfirmar={() => {
          set((d) => ({
            ...d,
            ingredientes: d.ingredientes.filter((x) => x.id !== apagarIng),
            sabores: d.sabores.map((s) => ({
              ...s,
              itens: s.itens.filter((it) => it.ingredienteId !== apagarIng),
            })),
          }))
          avisar('Ingrediente apagado')
        }}
      />
    </>
  )
}

/* ---------------------------------------------------------------
   Editor de sabor / receita
   --------------------------------------------------------------- */

function EditorSabor({
  sabor,
  ingredientes,
  margemAlvo,
  aoFechar,
  aoSalvar,
}: {
  sabor: Sabor
  ingredientes: Ingrediente[]
  margemAlvo: number
  aoFechar: () => void
  aoSalvar: (s: Sabor) => void
}) {
  const [s, setS] = useState<Sabor>({
    ...sabor,
    itens: sabor.itens.map((i) => ({ ...i })),
    extras: sabor.extras.map((e) => ({ ...e })),
  })
  const custo = custoDoSabor(s, ingredientes)
  const sugerido = precoSugerido(custo.unitario, margemAlvo)
  const preco = s.precoSugerido || sugerido

  return (
    <Sheet
      aberto
      titulo={s.nome}
      subtitulo="Receita da fornada e custo por brownie"
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn btn--soft" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn--block" onClick={() => aoSalvar(s)}>
            Salvar receita
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="card card--tint">
          <div className="row row--between">
            <div>
              <div className="label">Custo do brownie</div>
              <div className="money money--lg">{custo.vazio ? '—' : brl(custo.unitario)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label">Preço sugerido</div>
              <div className="money money--lg">{sugerido ? brl(sugerido) : '—'}</div>
            </div>
          </div>
          {!custo.vazio && !custo.manual && (
            <>
              <div className="divider" />
              <div className="muted">
                Fornada de {s.rendimento} brownies custa {brl(custo.fornada)} ({brl(custo.ingredientes)}{' '}
                de ingredientes + {brl(custo.extras)} de extras).
              </div>
            </>
          )}
          {preco > 0 && custo.unitario > 0 && (
            <div className="muted" style={{ marginTop: 6 }}>
              Vendendo a {brl(preco)} você ganha{' '}
              <b style={{ color: 'var(--ok)' }}>{brl(preco - custo.unitario)}</b> por brownie (
              {pct(1 - custo.unitario / preco)} de margem).
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="field">
            <span className="label">Rende (brownies)</span>
            <CampoNumero
              valor={s.rendimento}
              casas={0}
              aoMudar={(v) => setS({ ...s, rendimento: Math.round(v) })}
              sufixo="un"
            />
          </div>
          <div className="field">
            <span className="label">Preço de venda</span>
            <CampoDinheiro
              valor={s.precoSugerido ?? 0}
              aoMudar={(v) => setS({ ...s, precoSugerido: v })}
              placeholder={sugerido ? num(sugerido) : '0,00'}
            />
          </div>
        </div>

        <div className="section-title">
          <h2>Ingredientes da fornada</h2>
        </div>

        {ingredientes.length === 0 ? (
          <p className="muted">
            Cadastre os ingredientes primeiro na aba <b>Ingredientes</b> — ou informe o custo à mão
            logo abaixo.
          </p>
        ) : (
          <div className="list">
            {s.itens.map((it, idx) => {
              const ing = ingredientes.find((x) => x.id === it.ingredienteId)
              const c = custoIngredienteNaReceita(ing, it.qtd, it.unidade)
              return (
                <div key={it.id} className="card card--flat pop" style={{ padding: 12 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <select
                      className="select"
                      value={it.ingredienteId}
                      onChange={(e) => {
                        const itens = [...s.itens]
                        itens[idx] = { ...it, ingredienteId: e.target.value }
                        setS({ ...s, itens })
                      }}
                    >
                      {ingredientes.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      className="icon-btn"
                      aria-label="Remover"
                      onClick={() => setS({ ...s, itens: s.itens.filter((x) => x.id !== it.id) })}
                    >
                      <IcLixo style={{ width: 17, height: 17 }} />
                    </button>
                  </div>
                  <div className="row" style={{ marginTop: 10, gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <CampoNumero
                        valor={it.qtd}
                        aoMudar={(v) => {
                          const itens = [...s.itens]
                          itens[idx] = { ...it, qtd: v }
                          setS({ ...s, itens })
                        }}
                      />
                    </div>
                    <select
                      className="select"
                      style={{ width: 92 }}
                      value={it.unidade}
                      onChange={(e) => {
                        const itens = [...s.itens]
                        itens[idx] = { ...it, unidade: e.target.value as Unidade }
                        setS({ ...s, itens })
                      }}
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <div style={{ width: 76, textAlign: 'right' }} className="money money--md">
                      {brl(c)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {ingredientes.length > 0 && (
          <button
            className="btn btn--soft btn--block"
            onClick={() =>
              setS({
                ...s,
                itens: [
                  ...s.itens,
                  { id: novoId(), ingredienteId: ingredientes[0].id, qtd: 0, unidade: 'g' },
                ],
              })
            }
          >
            <IcMais style={{ width: 18, height: 18 }} />
            Adicionar ingrediente
          </button>
        )}

        <div className="section-title">
          <h2>Outros custos da fornada</h2>
        </div>
        <p className="muted" style={{ marginTop: -4 }}>
          Embalagem, etiqueta, gás, energia — tudo que some junto com a fornada.
        </p>

        <div className="list">
          {s.extras.map((ex, idx) => (
            <div key={ex.id} className="card card--flat" style={{ padding: 12 }}>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  placeholder="Ex: embalagem"
                  value={ex.nome}
                  onChange={(e) => {
                    const extras = [...s.extras]
                    extras[idx] = { ...ex, nome: e.target.value }
                    setS({ ...s, extras })
                  }}
                />
                <button
                  className="icon-btn"
                  aria-label="Remover"
                  onClick={() => setS({ ...s, extras: s.extras.filter((x) => x.id !== ex.id) })}
                >
                  <IcLixo style={{ width: 17, height: 17 }} />
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <CampoDinheiro
                  valor={ex.valor}
                  aoMudar={(v) => {
                    const extras = [...s.extras]
                    extras[idx] = { ...ex, valor: v }
                    setS({ ...s, extras })
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn btn--soft btn--block"
          onClick={() =>
            setS({ ...s, extras: [...s.extras, { id: novoId(), nome: '', valor: 0 }] })
          }
        >
          <IcMais style={{ width: 18, height: 18 }} />
          Adicionar custo
        </button>

        <div className="section-title">
          <h2>Ou informe direto</h2>
        </div>
        <div className="field">
          <span className="label">Custo de 1 brownie (à mão)</span>
          <CampoDinheiro
            valor={s.custoManual ?? 0}
            aoMudar={(v) => setS({ ...s, custoManual: v })}
          />
          <p className="muted">
            Usado só enquanto a receita não estiver montada. Se houver receita, ela manda.
          </p>
        </div>
      </div>
    </Sheet>
  )
}

/* ---------------------------------------------------------------
   Editor de ingrediente
   --------------------------------------------------------------- */

function EditorIngrediente({
  ingrediente,
  existe,
  aoFechar,
  aoSalvar,
  aoApagar,
}: {
  ingrediente: Ingrediente
  existe: boolean
  aoFechar: () => void
  aoSalvar: (i: Ingrediente) => void
  aoApagar: () => void
}) {
  const [i, setI] = useState<Ingrediente>({ ...ingrediente })
  const unitario = custoPorUnidadeBase(i)

  return (
    <Sheet
      aberto
      titulo={existe ? 'Editar ingrediente' : 'Novo ingrediente'}
      subtitulo="Do jeitinho que você compra no mercado"
      aoFechar={aoFechar}
      rodape={
        <>
          {existe ? (
            <button className="btn btn--soft" onClick={aoApagar}>
              <IcLixo style={{ width: 17, height: 17 }} />
            </button>
          ) : (
            <button className="btn btn--soft" onClick={aoFechar}>
              Cancelar
            </button>
          )}
          <button
            className="btn btn--block"
            disabled={!i.nome.trim() || i.precoPacote <= 0 || i.qtdPacote <= 0}
            onClick={() => aoSalvar({ ...i, nome: i.nome.trim() })}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <span className="label">Nome</span>
          <input
            className="input"
            placeholder="Ex: Chocolate 50%"
            value={i.nome}
            autoFocus={!existe}
            onChange={(e) => setI({ ...i, nome: e.target.value })}
          />
        </div>
        <div className="field">
          <span className="label">Quanto você paga no pacote</span>
          <CampoDinheiro valor={i.precoPacote} aoMudar={(v) => setI({ ...i, precoPacote: v })} />
        </div>
        <div className="grid-2">
          <div className="field">
            <span className="label">Quanto vem</span>
            <CampoNumero valor={i.qtdPacote} casas={0} aoMudar={(v) => setI({ ...i, qtdPacote: v })} />
          </div>
          <div className="field">
            <span className="label">Unidade</span>
            <select
              className="select"
              value={i.unidade}
              onChange={(e) => setI({ ...i, unidade: e.target.value as Unidade })}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        {unitario > 0 && (
          <div className="card card--tint">
            <div className="row row--between">
              <span className="muted">Sai por</span>
              <span className="money money--md">
                {brl(unitario * (i.unidade === 'un' ? 1 : 100))}
                <span className="muted" style={{ fontWeight: 600 }}>
                  {' '}
                  / {i.unidade === 'un' ? 'unidade' : i.unidade === 'ml' || i.unidade === 'L' ? '100ml' : '100g'}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
