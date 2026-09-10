import { useCallback, useEffect, useState } from "react";
import { Bonequinha, Splash, Toast } from "./components/ui";
import {
  IcBolo,
  IcCasa,
  IcCoracaoAjustes,
  IcCofre,
  IcSacola,
} from "./components/icons";
import Inicio from "./screens/Inicio";
import Vendas from "./screens/Vendas";
import Custos from "./screens/Custos";
import Caixa from "./screens/Caixa";
import Ajustes from "./screens/Ajustes";
import { useAlturaDaTela } from "./lib/tela";
import { useStore } from "./lib/store";
import Entrada from "./components/Entrada";

export type Aba = "inicio" | "vendas" | "custos" | "caixa" | "ajustes";

const ABAS: {
  id: Aba;
  nome: string;
  Icone: (p: { className?: string }) => JSX.Element;
}[] = [
  { id: "inicio", nome: "Início", Icone: IcCasa },
  { id: "vendas", nome: "Vendas", Icone: IcSacola },
  { id: "custos", nome: "Custos", Icone: IcBolo },
  { id: "caixa", nome: "Caixa", Icone: IcCofre },
  { id: "ajustes", nome: "Ajustes", Icone: IcCoracaoAjustes },
];

const TITULOS: Record<Aba, string> = {
  inicio: "Resumo",
  vendas: "Vendas",
  custos: "Custos",
  caixa: "Caixa",
  ajustes: "Ajustes",
};

export default function App() {
  useAlturaDaTela();
  const { temNuvem, entrou, sessaoConhecida, estado, pendentes } = useStore();
  const [splash, setSplash] = useState(
    () => !sessionStorage.getItem("loreta.visto"),
  );
  const [aba, setAba] = useState<Aba>("inicio");
  const [toast, setToast] = useState<string | null>(null);

  const fecharSplash = useCallback(() => {
    sessionStorage.setItem("loreta.visto", "1");
    setSplash(false);
  }, []);

  const avisar = useCallback((texto: string) => setToast(texto), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // ainda descobrindo se já tem sessão: segura a tela pra não piscar o login
  if (temNuvem && !sessaoConhecida)
    return <div className="entrada" aria-busy="true" />;

  if (temNuvem && !entrou)
    return (
      <>
        {splash && <Splash aoTerminar={fecharSplash} />}
        <Entrada />
      </>
    );

  return (
    <div className="shell">
      {splash && <Splash aoTerminar={fecharSplash} />}

      <header className="topbar">
        <div className="topbar__brand">
          <Bonequinha className="topbar__doll" />
          <div className="topbar__title">
            <img src="./loreta-wordmark.png" alt="Loreta" />
            <span className="topbar__sub">Doceria Artesanal</span>
          </div>
        </div>
        <div className="topbar__lado">
          {temNuvem && (estado === "offline" || pendentes > 0) && (
            <span
              className={`selo ${pendentes > 0 ? "selo--espera" : "selo--offline"}`}
              title={
                pendentes > 0
                  ? `${pendentes} ${pendentes === 1 ? "lançamento" : "lançamentos"} esperando internet`
                  : "sem conexão com o banco"
              }
            >
              {pendentes > 0 ? `${pendentes} pra enviar` : "sem internet"}
            </span>
          )}
          <span className="topbar__page">{TITULOS[aba]}</span>
        </div>
      </header>

      <main className="scroll" key={aba}>
        <div className="enter">
          {aba === "inicio" && <Inicio irPara={setAba} />}
          {aba === "vendas" && <Vendas avisar={avisar} />}
          {aba === "custos" && <Custos avisar={avisar} />}
          {aba === "caixa" && <Caixa avisar={avisar} />}
          {aba === "ajustes" && <Ajustes avisar={avisar} />}
        </div>
      </main>

      {toast && <Toast texto={toast} />}

      <nav className="tabbar">
        <div className="sidebar-brand">
          <Bonequinha />
          <img className="marca" src="./loreta-wordmark.png" alt="Loreta" />
          <span>Doceria Artesanal</span>
        </div>
        {ABAS.map(({ id, nome, Icone }) => (
          <button
            key={id}
            className={`tabbar__item${aba === id ? " is-active" : ""}`}
            onClick={() => setAba(id)}
            aria-current={aba === id}
          >
            <Icone />
            <span>{nome}</span>
          </button>
        ))}
        <div className="sidebar-rodape">
          Feito com carinho
          <br />
          pra Julia Potkul ♡
        </div>
      </nav>
    </div>
  );
}
