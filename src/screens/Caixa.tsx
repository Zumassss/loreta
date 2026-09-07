import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import type { CategoriaDespesa, Despesa, Retirada } from "../lib/types";
import {
  brl,
  dataCurta,
  hoje,
  id as novoId,
  mesAtual,
  mesDe,
  nomeMes,
  pct,
} from "../lib/format";
import {
  caixa as calcCaixa,
  dividirLucro,
  mapaDeCustos,
  pontoEquilibrio,
  resultado,
} from "../lib/finance";
import { CampoDinheiro, Confirmar, Dinheiro, Sheet } from "../components/ui";
import { IcCarrinho, IcLivro, IcMoeda, IcSetaBaixo } from "../components/icons";

const CATEGORIAS: { id: CategoriaDespesa; nome: string }[] = [
  { id: "ingredientes", nome: "Ingredientes" },
  { id: "embalagem", nome: "Embalagem" },
  { id: "transporte", nome: "Transporte" },
  { id: "equipamento", nome: "Equipamento" },
  { id: "taxas", nome: "Taxas" },
  { id: "outros", nome: "Outros" },
];

export default function Caixa({ avisar }: { avisar: (t: string) => void }) {
  const { db, set } = useStore();
  const custos = useMemo(() => mapaDeCustos(db), [db]);
  const [periodo, setPeriodo] = useState<"mes" | "tudo">("mes");
  const [formGasto, setFormGasto] = useState<Despesa | null>(null);
  const [formRetirada, setFormRetirada] = useState<Retirada | null>(null);
  const [guia, setGuia] = useState(false);
  const [apagar, setApagar] = useState<{
    tipo: "despesa" | "retirada";
    id: string;
  } | null>(null);

  const mes = mesAtual();
  const noPeriodo = <T extends { data: string }>(xs: T[]) =>
    periodo === "mes" ? xs.filter((x) => mesDe(x.data) === mes) : xs;

  const vendas = noPeriodo(db.vendas);
  const despesas = noPeriodo(db.despesas);
  const retiradas = noPeriodo(db.retiradas);

  const res = resultado(
    vendas,
    custos,
    db.pontos,
    db.config,
    periodo === "mes" ? (vendas.length ? 1 : 0) : undefined,
  );
  const divisao = dividirLucro(res.lucro, db.config);
  const equilibrio = pontoEquilibrio(res, db.config);
  // o caixa é sempre acumulado — dinheiro não reseta no dia 1º
  const cx = calcCaixa(
    db.vendas,
    db.despesas,
    db.retiradas,
    custos,
    db.pontos,
    db.config,
  );

  const movimentos = [
    ...despesas.map((d) => ({
      tipo: "despesa" as const,
      id: d.id,
      data: d.data,
      titulo:
        d.descricao ||
        CATEGORIAS.find((c) => c.id === d.categoria)?.nome ||
        "Gasto",
      sub: CATEGORIAS.find((c) => c.id === d.categoria)?.nome ?? "",
      valor: -d.valor,
    })),
    ...retiradas.map((r) => ({
      tipo: "retirada" as const,
      id: r.id,
      data: r.data,
      titulo: "Retirada da Julia",
      sub: r.obs || "pró-labore",
      valor: -r.valor,
    })),
  ].sort((a, b) => b.data.localeCompare(a.data));

  const salvarGasto = () => {
    if (!formGasto || formGasto.valor <= 0) return;
    set((d) => ({
      ...d,
      despesas: d.despesas.some((x) => x.id === formGasto.id)
        ? d.despesas.map((x) => (x.id === formGasto.id ? formGasto : x))
        : [formGasto, ...d.despesas],
    }));
    avisar("Gasto lançado");
    setFormGasto(null);
  };

  const salvarRetirada = () => {
    if (!formRetirada || formRetirada.valor <= 0) return;
    set((d) => ({
      ...d,
      retiradas: d.retiradas.some((x) => x.id === formRetirada.id)
        ? d.retiradas.map((x) => (x.id === formRetirada.id ? formRetirada : x))
        : [formRetirada, ...d.retiradas],
    }));
    avisar("Retirada registrada");
    setFormRetirada(null);
  };

  return (
    <>
      <div className="stack">
        {/* saldo */}
        <section className="hero">
          <div className="hero__stripes" />
          <div className="hero__body">
            <div className="label">Dinheiro no caixa hoje</div>
            <Dinheiro
              valor={cx.saldo}
              className={`money money--xl${cx.saldo < 0 ? " neg" : ""}`}
            />
            <div className="bar" style={{ marginTop: 10 }}>
              <span
                style={{
                  width: `${cx.entradas > 0 ? Math.min((cx.saidas / cx.entradas) * 100, 100) : 0}%`,
                  background: "var(--alert)",
                }}
              />
              <span
                style={{
                  width: `${cx.entradas > 0 ? Math.min((cx.retiradas / cx.entradas) * 100, 100) : 0}%`,
                  background: "var(--peach)",
                }}
              />
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              {brl(cx.entradas)} de vendas · {brl(cx.saidas)} de gastos ·{" "}
              {brl(cx.retiradas)} retirados pela Julia
            </div>
          </div>
        </section>

        <div className="grid-2">
          <button
            className="btn btn--soft btn--tight"
            onClick={() =>
              setFormGasto({
                id: novoId(),
                data: hoje(),
                categoria: "ingredientes",
                descricao: "",
                valor: 0,
              })
            }
          >
            <IcCarrinho style={{ width: 18, height: 18 }} />
            Lançar gasto
          </button>
          <button
            className="btn btn--peach btn--tight"
            onClick={() =>
              setFormRetirada({ id: novoId(), data: hoje(), valor: 0, obs: "" })
            }
          >
            <IcMoeda style={{ width: 18, height: 18 }} />
            Retirada
          </button>
        </div>

        <div className="painel">
          <div className="painel__col">
            {/* potinhos */}
            <section className="card">
              <div className="label">Os três potinhos da Loreta</div>
              <p className="muted" style={{ margin: "4px 0 12px" }}>
                Todo lucro é dividido assim, pra Loreta nunca ficar sem dinheiro
                pra próxima fornada.
              </p>
              <Potinho
                cor="var(--wine)"
                nome="Julia · pró-labore"
                porcento={db.config.splitJulia}
                valor={divisao.julia}
              />
              <Potinho
                cor="var(--blue-ink)"
                nome="Giro · repor insumos"
                porcento={db.config.splitGiro}
                valor={divisao.giro}
              />
              <Potinho
                cor="var(--peach)"
                nome="Reserva · crescimento"
                porcento={db.config.splitReserva}
                valor={divisao.reserva}
              />
              <div className="divider" />
              <div className="row row--between">
                <div>
                  <div className="label">A Julia ainda pode tirar</div>
                  <Dinheiro
                    valor={cx.disponivelJulia}
                    className="money money--lg"
                  />
                </div>
                <span className="tag">{brl(cx.retiradas)} já retirado</span>
              </div>
              {cx.disponivelJulia > cx.saldo && cx.saldo >= 0 && (
                <p className="muted" style={{ marginTop: 8 }}>
                  Só tem {brl(cx.saldo)} em caixa agora — tire no máximo isso
                  pra não faltar dinheiro pros ingredientes.
                </p>
              )}
            </section>

            {/* resultado */}
            <div className="section-title">
              <h2>Resultado</h2>
            </div>
            <div className="chips">
              <button
                className={`chip chip--blue${periodo === "mes" ? " is-on" : ""}`}
                onClick={() => setPeriodo("mes")}
              >
                {nomeMes(mes).split(" de ")[0]}
              </button>
              <button
                className={`chip chip--blue${periodo === "tudo" ? " is-on" : ""}`}
                onClick={() => setPeriodo("tudo")}
              >
                Desde o começo
              </button>
            </div>

            <section className="card">
              <Linha nome="Faturamento" valor={res.faturamento} forte />
              <Linha nome="Custo dos brownies vendidos" valor={-res.cmv} />
              {res.taxas > 0 && (
                <Linha nome="Taxas dos pontos" valor={-res.taxas} />
              )}
              {res.custosFixos > 0 && (
                <Linha nome="Custos fixos" valor={-res.custosFixos} />
              )}
              <div className="divider" />
              <div className="row row--between">
                <span style={{ fontWeight: 800, color: "var(--wine)" }}>
                  Lucro
                </span>
                <Dinheiro
                  valor={res.lucro}
                  className={`money money--lg${res.lucro < 0 ? " neg" : " pos"}`}
                />
              </div>
              {res.faturamento > 0 && (
                <div className="row row--between" style={{ marginTop: 4 }}>
                  <span className="muted">Margem</span>
                  <span className="tag">{pct(res.margemPct)}</span>
                </div>
              )}
              {res.cobertura < 1 && res.unidades > 0 && (
                <p className="muted" style={{ marginTop: 10 }}>
                  Atenção: {pct(1 - res.cobertura)} dos brownies vendidos ainda
                  estão sem custo cadastrado, então esse lucro está otimista.
                </p>
              )}
            </section>

            <div className="grid-2">
              <div className="card card--flat">
                <div className="label">Preço médio</div>
                <div className="money money--md">{brl(res.precoMedio)}</div>
                <div className="muted">por brownie</div>
              </div>
              <div className="card card--flat">
                <div className="label">Custo médio</div>
                <div className="money money--md">{brl(res.custoMedio)}</div>
                <div className="muted">por brownie</div>
              </div>
            </div>

            {db.config.custoFixoMensal > 0 && equilibrio.unidades > 0 && (
              <div className="card card--tint">
                <div className="label">Ponto de equilíbrio</div>
                <p style={{ margin: "6px 0 0", fontSize: 14 }}>
                  Com {brl(db.config.custoFixoMensal)} de custo fixo por mês, a
                  Loreta precisa vender{" "}
                  <b style={{ color: "var(--wine)" }}>
                    {equilibrio.unidades} brownies
                  </b>{" "}
                  ({brl(equilibrio.faturamento)}) só pra empatar. Tudo acima
                  disso é lucro.
                </p>
              </div>
            )}
          </div>

          <div className="painel__col">
            {/* movimentos */}
            <div className="section-title">
              <h2>Saídas</h2>
            </div>
            {movimentos.length === 0 ? (
              <p
                className="muted"
                style={{ textAlign: "center", padding: "10px 0" }}
              >
                Nenhuma saída lançada{" "}
                {periodo === "mes" ? "neste mês" : "ainda"}.
              </p>
            ) : (
              <div className="list">
                {movimentos.map((m) => (
                  <button
                    key={m.id}
                    className="item"
                    onClick={() => setApagar({ tipo: m.tipo, id: m.id })}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background:
                          m.tipo === "retirada"
                            ? "var(--peach-pale)"
                            : "var(--alert-bg)",
                        display: "grid",
                        placeItems: "center",
                        color:
                          m.tipo === "retirada" ? "#8a5a1c" : "var(--alert)",
                        flex: "0 0 auto",
                      }}
                    >
                      {m.tipo === "retirada" ? (
                        <IcMoeda style={{ width: 18, height: 18 }} />
                      ) : (
                        <IcCarrinho style={{ width: 18, height: 18 }} />
                      )}
                    </div>
                    <div className="item__main">
                      <div className="item__title">{m.titulo}</div>
                      <div className="item__sub">
                        {dataCurta(m.data)} · {m.sub}
                      </div>
                    </div>
                    <div className="money money--md neg">− {brl(-m.valor)}</div>
                  </button>
                ))}
              </div>
            )}

            {/* guia */}
            <button
              className="card"
              style={{ textAlign: "left" }}
              onClick={() => setGuia(!guia)}
            >
              <div className="row" style={{ gap: 10 }}>
                <IcLivro
                  style={{
                    width: 22,
                    height: 22,
                    color: "var(--wine)",
                    flex: "0 0 auto",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "var(--wine)",
                      fontSize: 14,
                    }}
                  >
                    Guia rápido do dinheiro
                  </div>
                  <div className="muted">
                    Como a Julia deve lidar com o caixa da Loreta
                  </div>
                </div>
                <IcSetaBaixo
                  style={{
                    width: 18,
                    height: 18,
                    color: "var(--wine)",
                    transform: guia ? "rotate(180deg)" : "none",
                    transition: "transform .2s ease",
                  }}
                />
              </div>
              {guia && (
                <div
                  className="pop"
                  style={{ marginTop: 14, fontSize: 13.5, lineHeight: 1.6 }}
                >
                  <Regra n={1} titulo="Caixa da Loreta ≠ bolso da Julia">
                    O dinheiro que entra é da Loreta. A Julia tira o dela em{" "}
                    <b>retiradas</b>, sempre registradas aqui. Assim dá pra
                    saber quanto o negócio realmente ganha.
                  </Regra>
                  <Regra n={2} titulo="Primeiro o custo, depois o lucro">
                    De cada venda, a parte que corresponde ao custo dos
                    ingredientes precisa voltar pro caixa — é ela que compra a
                    próxima fornada. O que sobra é lucro.
                  </Regra>
                  <Regra n={3} titulo="Divida o lucro em três potinhos">
                    {db.config.splitJulia}% pra Julia, {db.config.splitGiro}%
                    pro giro (comprar mais ingredientes e crescer a produção) e{" "}
                    {db.config.splitReserva}% pra reserva — imprevisto, forma
                    nova, batedeira que queima.
                  </Regra>
                  <Regra n={4} titulo="Preço mínimo: custo ÷ 0,4">
                    Se um brownie custa R$ 4 pra fazer, vender por menos de R$
                    10 come a margem. A Loreta já sugere o preço na aba Custos.
                  </Regra>
                  <Regra n={5} titulo="Reserve 1 fornada inteira em caixa">
                    Antes de tirar lucro grande, deixe no caixa o valor de pelo
                    menos uma fornada completa. É o colchão que impede a
                    produção de parar.
                  </Regra>
                  <Regra n={6} titulo="Cada ponto tem um preço">
                    Anote o faturamento por ponto: em pouco tempo dá pra ver
                    onde vale a pena ir e onde não paga nem o transporte.
                  </Regra>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- gasto ---------- */}
      <Sheet
        aberto={!!formGasto}
        titulo="Lançar gasto"
        subtitulo="Tudo que saiu do caixa da Loreta"
        aoFechar={() => setFormGasto(null)}
        rodape={
          <>
            <button
              className="btn btn--soft btn--tight"
              onClick={() => setFormGasto(null)}
            >
              Cancelar
            </button>
            <button
              className="btn btn--block"
              onClick={salvarGasto}
              disabled={!formGasto || formGasto.valor <= 0}
            >
              Salvar gasto
            </button>
          </>
        }
      >
        {formGasto && (
          <div className="stack">
            <div className="field">
              <span className="label">Categoria</span>
              <div className="chips">
                {CATEGORIAS.map((c) => (
                  <button
                    key={c.id}
                    className={`chip${formGasto.categoria === c.id ? " is-on" : ""}`}
                    onClick={() =>
                      setFormGasto({ ...formGasto, categoria: c.id })
                    }
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">Valor</span>
              <CampoDinheiro
                valor={formGasto.valor}
                autoFoco
                aoMudar={(v) => setFormGasto({ ...formGasto, valor: v })}
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <span className="label">Data</span>
                <input
                  className="input"
                  type="date"
                  value={formGasto.data}
                  onChange={(e) =>
                    setFormGasto({ ...formGasto, data: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <span className="label">Descrição</span>
                <input
                  className="input"
                  placeholder="Ex: chocolate"
                  value={formGasto.descricao}
                  onChange={(e) =>
                    setFormGasto({ ...formGasto, descricao: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {/* ---------- retirada ---------- */}
      <Sheet
        aberto={!!formRetirada}
        titulo="Retirada da Julia"
        subtitulo={`Disponível pra tirar: ${brl(cx.disponivelJulia)}`}
        aoFechar={() => setFormRetirada(null)}
        rodape={
          <>
            <button
              className="btn btn--soft"
              onClick={() => setFormRetirada(null)}
            >
              Cancelar
            </button>
            <button
              className="btn btn--block"
              onClick={salvarRetirada}
              disabled={!formRetirada || formRetirada.valor <= 0}
            >
              Registrar
            </button>
          </>
        }
      >
        {formRetirada && (
          <div className="stack">
            <div className="field">
              <span className="label">Quanto a Julia vai tirar</span>
              <CampoDinheiro
                valor={formRetirada.valor}
                autoFoco
                aoMudar={(v) => setFormRetirada({ ...formRetirada, valor: v })}
              />
            </div>
            {formRetirada.valor > cx.disponivelJulia && (
              <div
                className="card"
                style={{
                  background: "var(--alert-bg)",
                  borderColor: "var(--alert)",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    color: "var(--alert)",
                    fontSize: 13.5,
                  }}
                >
                  Isso é mais do que o lucro permite
                </div>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  A cota da Julia é {brl(cx.cotaJulia)} e {brl(cx.retiradas)} já
                  saíram. Tirar mais que isso significa gastar o dinheiro que
                  compra a próxima fornada.
                </p>
              </div>
            )}
            <div className="grid-2">
              <div className="field">
                <span className="label">Data</span>
                <input
                  className="input"
                  type="date"
                  value={formRetirada.data}
                  onChange={(e) =>
                    setFormRetirada({ ...formRetirada, data: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <span className="label">Observação</span>
                <input
                  className="input"
                  placeholder="opcional"
                  value={formRetirada.obs ?? ""}
                  onChange={(e) =>
                    setFormRetirada({ ...formRetirada, obs: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="chips">
              {[0.25, 0.5, 1].map((f) => (
                <button
                  key={f}
                  className="chip"
                  onClick={() =>
                    setFormRetirada({
                      ...formRetirada,
                      valor: Math.round(cx.disponivelJulia * f * 100) / 100,
                    })
                  }
                >
                  {f === 1 ? "tudo" : `${f * 100}%`} (
                  {brl(cx.disponivelJulia * f)})
                </button>
              ))}
            </div>
          </div>
        )}
      </Sheet>

      <Confirmar
        aberto={!!apagar}
        titulo="Apagar esse lançamento?"
        texto="Ele volta pro caixa e some dos relatórios."
        aoFechar={() => setApagar(null)}
        aoConfirmar={() => {
          if (!apagar) return;
          set((d) =>
            apagar.tipo === "despesa"
              ? { ...d, despesas: d.despesas.filter((x) => x.id !== apagar.id) }
              : {
                  ...d,
                  retiradas: d.retiradas.filter((x) => x.id !== apagar.id),
                },
          );
          avisar("Lançamento apagado");
        }}
      />
    </>
  );
}

function Potinho({
  cor,
  nome,
  porcento,
  valor,
}: {
  cor: string;
  nome: string;
  porcento: number;
  valor: number;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row row--between" style={{ marginBottom: 5, gap: 10 }}>
        <span className="linha-nome">
          <i className="ponto-cor" style={{ background: cor }} />
          {nome}
        </span>
        <span className="money money--md" style={{ flex: "0 0 auto" }}>
          {brl(valor)}
        </span>
      </div>
      <div className="bar" style={{ height: 7 }}>
        <span style={{ width: `${porcento}%`, background: cor }} />
      </div>
    </div>
  );
}

function Linha({
  nome,
  valor,
  forte,
}: {
  nome: string;
  valor: number;
  forte?: boolean;
}) {
  return (
    <div className="row row--between" style={{ marginBottom: 6 }}>
      <span
        className={forte ? "" : "muted"}
        style={forte ? { fontWeight: 700 } : undefined}
      >
        {nome}
      </span>
      <span
        style={{
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: valor < 0 ? "var(--alert)" : "var(--wine)",
        }}
      >
        {valor < 0 ? `− ${brl(-valor)}` : brl(valor)}
      </span>
    </div>
  );
}

function Regra({
  n,
  titulo,
  children,
}: {
  n: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "var(--blue-pale)",
          color: "var(--wine)",
          display: "grid",
          placeItems: "center",
          fontWeight: 800,
          fontSize: 12,
          flex: "0 0 auto",
        }}
      >
        {n}
      </div>
      <div>
        <div style={{ fontWeight: 800, color: "var(--wine)" }}>{titulo}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
