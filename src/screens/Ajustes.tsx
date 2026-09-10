import { useState, type CSSProperties } from "react";
import { useStore } from "../lib/store";
import type { Ponto, Sabor } from "../lib/types";
import { brl, id as novoId, pct } from "../lib/format";
import {
  Bonequinha,
  CampoDinheiro,
  CampoNumero,
  Confirmar,
  Sheet,
} from "../components/ui";
import {
  IcCheck,
  IcLapis,
  IcLixo,
  IcMais,
  IcPlanilha,
} from "../components/icons";
import { baixarPlanilha, gerarPlanilha } from "../lib/excel";

export default function Ajustes({ avisar }: { avisar: (t: string) => void }) {
  const {
    db,
    set,
    reset,
    exportar,
    importar,
    temNuvem,
    estado,
    pendentes,
    enviarEsteAparelho,
    sair,
    bancoVazio,
  } = useStore();
  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [sabor, setSabor] = useState<Sabor | null>(null);
  const [confirmarReset, setConfirmarReset] = useState(false);
  const [importando, setImportando] = useState(false);
  const [texto, setTexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [subindo, setSubindo] = useState(false);

  const somaSplit =
    db.config.splitJulia + db.config.splitGiro + db.config.splitReserva;

  const mudarSplit = (
    chave: "splitJulia" | "splitGiro" | "splitReserva",
    valor: number,
  ) => set((d) => ({ ...d, config: { ...d.config, [chave]: valor } }));

  const baixarBackup = () => {
    try {
      const blob = new Blob([exportar()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `loreta-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      avisar("Backup salvo!");
    } catch {
      avisar("Não deu pra baixar aqui");
    }
  };

  return (
    <>
      <div className="stack">
        <div className="painel">
          <div className="painel__col">
            {/* ---------- divisão do lucro ---------- */}
            <div className="section-title">
              <h2>Divisão do lucro</h2>
            </div>
            <section className="card">
              <p className="muted" style={{ margin: "0 0 14px" }}>
                De cada real de lucro, quanto vai pra cada potinho. A soma
                precisa dar 100%.
              </p>
              <Slider
                nome="Julia · pró-labore"
                cor="var(--wine)"
                valor={db.config.splitJulia}
                aoMudar={(v) => mudarSplit("splitJulia", v)}
              />
              <Slider
                nome="Giro · repor insumos"
                cor="var(--blue-ink)"
                valor={db.config.splitGiro}
                aoMudar={(v) => mudarSplit("splitGiro", v)}
              />
              <Slider
                nome="Reserva · crescimento"
                cor="var(--peach)"
                valor={db.config.splitReserva}
                aoMudar={(v) => mudarSplit("splitReserva", v)}
              />
              {somaSplit !== 100 && (
                <div className="row row--between" style={{ marginTop: 4 }}>
                  <span className="tag tag--alert">soma {somaSplit}%</span>
                  <button
                    className="btn btn--sm btn--soft"
                    onClick={() =>
                      set((d) => ({
                        ...d,
                        config: {
                          ...d.config,
                          splitJulia: 60,
                          splitGiro: 25,
                          splitReserva: 15,
                        },
                      }))
                    }
                  >
                    voltar ao sugerido
                  </button>
                </div>
              )}
            </section>

            {/* ---------- números do negócio ---------- */}
            <div className="section-title">
              <h2>Números do negócio</h2>
            </div>
            <section className="card">
              <div className="field" style={{ marginBottom: 14 }}>
                <span className="label">Meta de faturamento por mês</span>
                <CampoDinheiro
                  valor={db.config.metaMensal}
                  aoMudar={(v) =>
                    set((d) => ({
                      ...d,
                      config: { ...d.config, metaMensal: v },
                    }))
                  }
                />
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <span className="label">Custo fixo por mês</span>
                <CampoDinheiro
                  valor={db.config.custoFixoMensal}
                  aoMudar={(v) =>
                    set((d) => ({
                      ...d,
                      config: { ...d.config, custoFixoMensal: v },
                    }))
                  }
                />
                <p className="muted">
                  Gás, energia, internet, transporte fixo — o que sai todo mês.
                </p>
              </div>
              <div className="field">
                <span className="label">
                  Margem alvo ({pct(db.config.margemAlvo)})
                </span>
                <input
                  type="range"
                  min={30}
                  max={80}
                  step={5}
                  value={Math.round(db.config.margemAlvo * 100)}
                  onChange={(e) =>
                    set((d) => ({
                      ...d,
                      config: {
                        ...d.config,
                        margemAlvo: Number(e.target.value) / 100,
                      },
                    }))
                  }
                  style={
                    {
                      "--cor": "var(--wine)",
                      "--fill": `${((db.config.margemAlvo * 100 - 30) / 50) * 100}%`,
                    } as CSSProperties
                  }
                />
                <p className="muted">
                  Usada pra sugerir o preço de venda: custo ÷{" "}
                  {(1 - db.config.margemAlvo).toFixed(2)}. Pra doce artesanal,
                  60% é um bom alvo.
                </p>
              </div>
            </section>
          </div>

          <div className="painel__col">
            {/* ---------- pontos ---------- */}
            <div className="section-title">
              <h2>Pontos de venda</h2>
            </div>
            <div className="list">
              {db.pontos.map((p) => (
                <div key={p.id} className="item">
                  <button
                    className="chip"
                    style={{
                      padding: 0,
                      width: 30,
                      height: 30,
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: p.ativo ? "var(--wine)" : "var(--cream)",
                      color: p.ativo ? "var(--cream)" : "var(--wine-soft)",
                    }}
                    onClick={() =>
                      set((d) => ({
                        ...d,
                        pontos: d.pontos.map((x) =>
                          x.id === p.id ? { ...x, ativo: !x.ativo } : x,
                        ),
                      }))
                    }
                    aria-label={p.ativo ? "Desativar" : "Ativar"}
                  >
                    <IcCheck style={{ width: 15, height: 15 }} />
                  </button>
                  <div className="item__main">
                    <div
                      className="item__title"
                      style={{ opacity: p.ativo ? 1 : 0.5 }}
                    >
                      {p.nome}
                    </div>
                    {p.taxaPct > 0 && (
                      <div className="item__sub">
                        {p.taxaPct}% de taxa do local
                      </div>
                    )}
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => setPonto(p)}
                    aria-label="Editar"
                  >
                    <IcLapis style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn--soft btn--block"
              onClick={() =>
                setPonto({ id: novoId(), nome: "", ativo: true, taxaPct: 0 })
              }
            >
              <IcMais style={{ width: 18, height: 18 }} />
              Novo ponto de venda
            </button>

            {/* ---------- sabores ---------- */}
            <div className="section-title">
              <h2>Sabores</h2>
            </div>
            <div className="list">
              {db.sabores.map((s) => (
                <div key={s.id} className="item">
                  <button
                    className="chip"
                    style={{
                      padding: 0,
                      width: 30,
                      height: 30,
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: s.ativo ? "var(--wine)" : "var(--cream)",
                      color: s.ativo ? "var(--cream)" : "var(--wine-soft)",
                    }}
                    onClick={() =>
                      set((d) => ({
                        ...d,
                        sabores: d.sabores.map((x) =>
                          x.id === s.id ? { ...x, ativo: !x.ativo } : x,
                        ),
                      }))
                    }
                    aria-label={s.ativo ? "Desativar" : "Ativar"}
                  >
                    <IcCheck style={{ width: 15, height: 15 }} />
                  </button>
                  <div className="item__main">
                    <div
                      className="item__title"
                      style={{ opacity: s.ativo ? 1 : 0.5 }}
                    >
                      {s.nome}
                    </div>
                    {s.precoSugerido ? (
                      <div className="item__sub">
                        vendido a {brl(s.precoSugerido)}
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => setSabor(s)}
                    aria-label="Editar"
                  >
                    <IcLapis style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn--soft btn--block"
              onClick={() =>
                setSabor({
                  id: novoId(),
                  nome: "",
                  ativo: true,
                  rendimento: 0,
                  itens: [],
                  extras: [],
                })
              }
            >
              <IcMais style={{ width: 18, height: 18 }} />
              Novo sabor
            </button>

            {/* ---------- sincronização ---------- */}
            <div className="section-title">
              <h2>Sincronização</h2>
            </div>
            <section className="card">
              {temNuvem ? (
                <>
                  <div className="row row--between">
                    <span className="linha-nome">
                      <i
                        className="ponto-cor"
                        style={{
                          background:
                            estado === "sincronizado"
                              ? "var(--ok)"
                              : estado === "offline"
                                ? "var(--alert)"
                                : "var(--peach)",
                        }}
                      />
                      {estado === "sincronizado"
                        ? "Tudo salvo no banco"
                        : estado === "offline"
                          ? "Sem conexão agora"
                          : estado === "enviando"
                            ? "Enviando…"
                            : "Carregando…"}
                    </span>
                    {pendentes > 0 && (
                      <span className="tag tag--peach">
                        {pendentes} na fila
                      </span>
                    )}
                  </div>
                  <p className="muted" style={{ margin: "8px 0 0" }}>
                    Os lançamentos ficam no banco da Loreta: qualquer aparelho
                    que entrar com a senha vê o mesmo saldo e o mesmo histórico,
                    na hora. Sem internet o app continua funcionando e envia
                    sozinho quando a conexão voltar.
                  </p>
                  <div className="divider" />
                  <div className="grid-2">
                    <button
                      className="btn btn--soft btn--tight"
                      disabled={subindo}
                      onClick={async () => {
                        setSubindo(true);
                        const deu = await enviarEsteAparelho();
                        setSubindo(false);
                        avisar(
                          deu
                            ? "Dados enviados ♡"
                            : "Não deu agora — tente de novo",
                        );
                      }}
                    >
                      {subindo ? "Enviando…" : "Enviar deste aparelho"}
                    </button>
                    <button
                      className="btn btn--soft btn--tight"
                      onClick={() => {
                        void sair();
                        avisar("Você saiu");
                      }}
                    >
                      Sair da conta
                    </button>
                  </div>
                  {bancoVazio && (
                    <p className="muted" style={{ margin: "10px 0 0" }}>
                      O banco ainda está vazio. Toque em{" "}
                      <b>Enviar deste aparelho</b> pra mandar pra lá o que você
                      já lançou aqui.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="row row--between">
                    <span className="linha-nome">
                      <i
                        className="ponto-cor"
                        style={{ background: "var(--peach)" }}
                      />
                      Só neste aparelho
                    </span>
                  </div>
                  <p className="muted" style={{ margin: "8px 0 0" }}>
                    O banco ainda não foi ligado, então os lançamentos ficam
                    guardados só neste celular. Assim que as chaves do Supabase
                    entrarem no site, todo mundo passa a ver o mesmo caixa.
                  </p>
                </>
              )}
            </section>

            {/* ---------- planilha ---------- */}
            <div className="section-title">
              <h2>Planilha</h2>
            </div>
            <section className="card planilha-card">
              <Bonequinha className="planilha-card__doll" />
              <div className="label">Relatório completo</div>
              <h3 style={{ fontSize: 17, margin: "2px 0 6px" }}>
                Planilha do Excel
              </h3>
              <p
                className="muted"
                style={{ margin: "0 0 14px", maxWidth: "78%" }}
              >
                Um arquivo com a cara da Loreta: capa com a logo, resumo do
                caixa, vendas dia a dia, cada brownie vendido, desempenho por
                ponto e por sabor, ficha de custo, gastos e retiradas.
              </p>
              <button
                className="btn btn--peach btn--block"
                disabled={gerando}
                onClick={async () => {
                  setGerando(true);
                  try {
                    baixarPlanilha(await gerarPlanilha(db));
                    avisar("Planilha baixada ♡");
                  } catch {
                    avisar("Não deu pra gerar agora");
                  } finally {
                    setGerando(false);
                  }
                }}
              >
                <IcPlanilha style={{ width: 19, height: 19 }} />
                {gerando ? "Montando a planilha…" : "Baixar planilha do Excel"}
              </button>
            </section>

            {/* ---------- dados ---------- */}
            <div className="section-title">
              <h2>Seus dados</h2>
            </div>
            <section className="card card--tint">
              <p className="muted" style={{ margin: "0 0 12px" }}>
                Tudo fica guardado no seu próprio celular. Baixe um backup de
                vez em quando pra não perder nada se trocar de aparelho.
              </p>
              <div className="grid-2">
                <button
                  className="btn btn--soft btn--tight"
                  onClick={baixarBackup}
                >
                  Baixar backup
                </button>
                <button
                  className="btn btn--soft btn--tight"
                  onClick={() => setImportando(true)}
                >
                  Restaurar
                </button>
              </div>
              <div className="divider" />
              <div className="row row--between">
                <span className="muted">
                  {db.vendas.length} vendas · {db.despesas.length} gastos ·{" "}
                  {db.ingredientes.length} ingredientes
                </span>
                <button
                  className="btn btn--sm btn--ghost"
                  style={{ color: "var(--alert)", borderColor: "var(--alert)" }}
                  onClick={() => setConfirmarReset(true)}
                >
                  Zerar tudo
                </button>
              </div>
            </section>
          </div>
        </div>

        <p
          className="muted"
          style={{ textAlign: "center", padding: "4px 20px 0" }}
        >
          Loreta · Doceria Artesanal
          <br />
          um cardápio pensado em você, personalizado por você ♡
        </p>
      </div>

      {/* ---------- editor de ponto ---------- */}
      <Sheet
        aberto={!!ponto}
        titulo={
          ponto && db.pontos.some((p) => p.id === ponto.id)
            ? "Editar ponto"
            : "Novo ponto"
        }
        aoFechar={() => setPonto(null)}
        rodape={
          ponto ? (
            <>
              {db.pontos.some((p) => p.id === ponto.id) ? (
                <button
                  className="btn btn--soft"
                  onClick={() => {
                    set((d) => ({
                      ...d,
                      pontos: d.pontos.filter((p) => p.id !== ponto.id),
                    }));
                    setPonto(null);
                    avisar("Ponto removido");
                  }}
                >
                  <IcLixo style={{ width: 17, height: 17 }} />
                </button>
              ) : (
                <button
                  className="btn btn--soft"
                  onClick={() => setPonto(null)}
                >
                  Cancelar
                </button>
              )}
              <button
                className="btn btn--block"
                disabled={!ponto.nome.trim()}
                onClick={() => {
                  const limpo = { ...ponto, nome: ponto.nome.trim() };
                  set((d) => ({
                    ...d,
                    pontos: d.pontos.some((p) => p.id === limpo.id)
                      ? d.pontos.map((p) => (p.id === limpo.id ? limpo : p))
                      : [...d.pontos, limpo],
                  }));
                  setPonto(null);
                  avisar("Ponto salvo!");
                }}
              >
                Salvar
              </button>
            </>
          ) : undefined
        }
      >
        {ponto && (
          <div className="stack">
            <div className="field">
              <span className="label">Nome do lugar</span>
              <input
                className="input"
                placeholder="Ex: Ufes"
                autoFocus
                value={ponto.nome}
                onChange={(e) => setPonto({ ...ponto, nome: e.target.value })}
              />
            </div>
            <div className="field">
              <span className="label">Taxa do local (%)</span>
              <CampoNumero
                valor={ponto.taxaPct}
                casas={0}
                sufixo="%"
                aoMudar={(v) => setPonto({ ...ponto, taxaPct: v })}
              />
              <p className="muted">
                Se alguém fica com uma parte da venda (comissão), coloque aqui.
                Se não, deixe zero.
              </p>
            </div>
          </div>
        )}
      </Sheet>

      {/* ---------- editor de sabor ---------- */}
      <Sheet
        aberto={!!sabor}
        titulo={
          sabor && db.sabores.some((s) => s.id === sabor.id)
            ? "Editar sabor"
            : "Novo sabor"
        }
        aoFechar={() => setSabor(null)}
        rodape={
          sabor ? (
            <>
              {db.sabores.some((s) => s.id === sabor.id) ? (
                <button
                  className="btn btn--soft"
                  onClick={() => {
                    set((d) => ({
                      ...d,
                      sabores: d.sabores.filter((s) => s.id !== sabor.id),
                    }));
                    setSabor(null);
                    avisar("Sabor removido");
                  }}
                >
                  <IcLixo style={{ width: 17, height: 17 }} />
                </button>
              ) : (
                <button
                  className="btn btn--soft"
                  onClick={() => setSabor(null)}
                >
                  Cancelar
                </button>
              )}
              <button
                className="btn btn--block"
                disabled={!sabor.nome.trim()}
                onClick={() => {
                  const limpo = { ...sabor, nome: sabor.nome.trim() };
                  set((d) => ({
                    ...d,
                    sabores: d.sabores.some((s) => s.id === limpo.id)
                      ? d.sabores.map((s) => (s.id === limpo.id ? limpo : s))
                      : [...d.sabores, limpo],
                  }));
                  setSabor(null);
                  avisar("Sabor salvo!");
                }}
              >
                Salvar
              </button>
            </>
          ) : undefined
        }
      >
        {sabor && (
          <div className="stack">
            <div className="field">
              <span className="label">Nome do sabor</span>
              <input
                className="input"
                placeholder="Ex: Ninho com Nutella"
                autoFocus
                value={sabor.nome}
                onChange={(e) => setSabor({ ...sabor, nome: e.target.value })}
              />
            </div>
            <div className="field">
              <span className="label">Preço de venda</span>
              <CampoDinheiro
                valor={sabor.precoSugerido ?? 0}
                aoMudar={(v) => setSabor({ ...sabor, precoSugerido: v })}
              />
              <p className="muted">
                A receita e o custo você monta na aba Custos.
              </p>
            </div>
          </div>
        )}
      </Sheet>

      {/* ---------- restaurar ---------- */}
      <Sheet
        aberto={importando}
        titulo="Restaurar backup"
        subtitulo="Cole aqui o conteúdo do arquivo salvo"
        aoFechar={() => setImportando(false)}
        rodape={
          <>
            <button
              className="btn btn--soft"
              onClick={() => setImportando(false)}
            >
              Cancelar
            </button>
            <button
              className="btn btn--block"
              disabled={!texto.trim()}
              onClick={() => {
                if (importar(texto)) {
                  avisar("Backup restaurado!");
                  setImportando(false);
                  setTexto("");
                } else {
                  avisar("Arquivo inválido");
                }
              }}
            >
              Restaurar
            </button>
          </>
        }
      >
        <textarea
          className="input"
          rows={8}
          placeholder="{ ... }"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </Sheet>

      <Confirmar
        aberto={confirmarReset}
        titulo="Zerar tudo mesmo?"
        texto="Todas as vendas, gastos, ingredientes e receitas serão apagados. Baixe um backup antes!"
        rotulo="Zerar tudo"
        aoFechar={() => setConfirmarReset(false)}
        aoConfirmar={() => {
          reset();
          avisar("Tudo zerado");
        }}
      />
    </>
  );
}

function Slider({
  nome,
  cor,
  valor,
  aoMudar,
}: {
  nome: string;
  cor: string;
  valor: number;
  aoMudar: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="row row--between" style={{ marginBottom: 2 }}>
        <span className="linha-nome">
          <i className="ponto-cor" style={{ background: cor }} />
          {nome}
        </span>
        <span className="money money--md" style={{ flex: "0 0 auto" }}>
          {valor}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        style={{ "--cor": cor, "--fill": `${valor}%` } as CSSProperties}
      />
    </div>
  );
}
