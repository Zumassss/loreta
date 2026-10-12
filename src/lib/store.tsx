import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DB } from "./types";
import {
  ErroBanco,
  chamarBanco,
  esquecerSenha,
  exigeSenha,
  guardarSenha,
  senhaGuardada,
  temNuvem,
} from "./banco";
import {
  aplicar,
  baixarTudo,
  estaVazio,
  gravarFila,
  lerFila,
  operacoesDeTudo,
  operacoesEntre,
  type Operacao,
} from "./nuvem";

const CHAVE = "loreta.caixa.v1";

/** quantas vezes tentar ler o banco antes de dar o app como offline */
const TENTATIVAS = 3;

/** de quanto em quanto tempo o app confere se outro aparelho lançou algo */
const INTERVALO_ABERTO = 15000;

const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/** id fixo a partir do nome: se dois celulares semearem o banco vazio ao mesmo
    tempo, os dois geram exatamente as mesmas linhas e nada duplica */
const apelido = (prefixo: string, nome: string) =>
  `${prefixo}-` +
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const semente = (): DB => ({
  versao: 1,
  pontos: [
    "Ufes",
    "Farmacro",
    "Uvv Noite",
    "Uvv Dia",
    "Clínica Fono",
    "Amigas Laura",
    "Vendas Marcelo",
  ].map((nome) => ({
    id: apelido("ponto", nome),
    nome,
    ativo: true,
    taxaPct: 0,
  })),
  sabores: [
    "Ninho com Nutella",
    "Snickers",
    "Maracujá",
    "Tradicional",
    "Doce de Leite",
  ].map((nome) => ({
    id: apelido("sabor", nome),
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
});

function carregar(): DB {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return semente();
    const dado = JSON.parse(bruto) as DB;
    const base = semente();
    // mescla defensiva: se faltar campo novo, usa o da semente
    return {
      ...base,
      ...dado,
      config: { ...base.config, ...(dado.config || {}) },
      pontos: dado.pontos ?? base.pontos,
      sabores: dado.sabores ?? base.sabores,
      ingredientes: dado.ingredientes ?? [],
      vendas: dado.vendas ?? [],
      despesas: dado.despesas ?? [],
      retiradas: dado.retiradas ?? [],
    };
  } catch {
    return semente();
  }
}

function guardar(db: DB) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(db));
  } catch {
    /* espaço cheio ou modo privado — segue sem travar o app */
  }
}

export type Estado =
  | "local"
  | "carregando"
  | "sincronizado"
  | "enviando"
  | "offline";

interface Ctx {
  db: DB;
  set: (fn: (atual: DB) => DB) => void;
  reset: () => void;
  importar: (json: string) => boolean;
  exportar: () => string;
  /* nuvem */
  temNuvem: boolean;
  exigeSenha: boolean;
  entrou: boolean;
  sessaoConhecida: boolean;
  estado: Estado;
  pendentes: number;
  entrar: (senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
  enviarEsteAparelho: () => Promise<boolean>;
  bancoVazio: boolean;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDbEstado] = useState<DB>(carregar);
  const dbRef = useRef<DB>(db);
  // com senha da casa, "entrou" = este aparelho já guardou a senha certa
  const [entrou, setEntrou] = useState(() => Boolean(senhaGuardada()));
  const sessaoConhecida = true;
  const [estado, setEstado] = useState<Estado>(
    temNuvem ? "carregando" : "local",
  );
  const [pendentes, setPendentes] = useState(() => lerFila().length);
  const [bancoVazio, setBancoVazio] = useState(false);
  const fila = useRef<Operacao[]>(lerFila());
  const enviando = useRef(false);

  /** guarda o estado e o espelho local, sem mexer na fila */
  const aplicarLocal = useCallback((novo: DB) => {
    dbRef.current = novo;
    setDbEstado(novo);
    guardar(novo);
  }, []);

  const salvarFila = useCallback((ops: Operacao[]) => {
    fila.current = ops;
    gravarFila(ops);
    setPendentes(ops.length);
  }, []);

  /** manda pro banco tudo que está na fila, em ordem */
  const escoar = useCallback(async () => {
    if (!temNuvem || enviando.current || fila.current.length === 0) return;
    enviando.current = true;
    setEstado("enviando");
    try {
      while (fila.current.length) {
        await aplicar(fila.current[0]);
        salvarFila(fila.current.slice(1));
      }
      setEstado("sincronizado");
    } catch {
      // sem internet ou erro do banco: a fila fica guardada pra próxima
      setEstado("offline");
    } finally {
      enviando.current = false;
    }
  }, [salvarFila]);

  const enfileirar = useCallback(
    (ops: Operacao[]) => {
      if (!temNuvem || !ops.length) return;
      salvarFila([...fila.current, ...ops]);
      void escoar();
    },
    [escoar, salvarFila],
  );

  const set = useCallback(
    (fn: (atual: DB) => DB) => {
      const atual = dbRef.current;
      const novo = fn(atual);
      aplicarLocal(novo);
      enfileirar(operacoesEntre(atual, novo));
    },
    [aplicarLocal, enfileirar],
  );

  /* ---------- sessão ---------- */

  const entrar = useCallback(async (senha: string) => {
    if (!temNuvem) return "Este site ainda não está ligado no banco.";
    try {
      await chamarBanco("GET", undefined, senha);
    } catch (e) {
      if (e instanceof ErroBanco && e.status === 401)
        return "Senha errada — tente de novo.";
      return "Sem conexão com o banco agora — tente de novo.";
    }
    guardarSenha(senha);
    setEntrou(true);
    return null;
  }, []);

  const sair = useCallback(async () => {
    esquecerSenha();
    setEntrou(false);
  }, []);

  /* ---------- carregar do banco + conferência periódica ---------- */

  const baixar = useCallback(async () => {
    if (!temNuvem) return;
    // enquanto houver coisa pra subir, o aparelho manda antes de receber
    if (fila.current.length) {
      await escoar();
      if (fila.current.length) return;
    }
    // As sete tabelas são buscadas em paralelo. Logo depois do login uma delas
    // pode sair antes do token novo e voltar 401 — e aí a resposta boa das
    // outras seis ia junto pro lixo, o app se declarava sem internet e a tela
    // ficava zerada. Tenta de novo antes de desistir.
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      try {
        const remoto = await baixarTudo(dbRef.current);

        // Banco recém-criado: quem chega primeiro semeia. Sem isso o app trocaria
        // os dados do aparelho por um banco vazio e a Julia abriria o site sem
        // nenhum ponto de venda e nenhum sabor pra escolher.
        if (estaVazio(remoto)) {
          setBancoVazio(true);
          enfileirar(operacoesDeTudo(dbRef.current));
          await escoar();
          if (fila.current.length === 0) setBancoVazio(false);
          return;
        }

        setBancoVazio(false);
        aplicarLocal(remoto);
        setEstado("sincronizado");
        return;
      } catch (e) {
        // senha trocada na Vercel: volta pra tela de entrada
        if (e instanceof ErroBanco && e.status === 401) {
          esquecerSenha();
          setEntrou(false);
          setEstado("offline");
          return;
        }
        if (tentativa === TENTATIVAS) {
          setEstado("offline");
          return;
        }
        await espera(300 * tentativa);
      }
    }
  }, [aplicarLocal, enfileirar, escoar]);

  // sem senha o app sincroniza assim que abre; com senha, só depois de entrar
  const liberado = temNuvem && (!exigeSenha || entrou);

  useEffect(() => {
    if (!liberado) return;

    setEstado("carregando");
    void baixar();

    // Sem tempo real: com a aba aberta, confere o banco a cada 15 s, e na hora
    // em que o celular volta pro app. Antes de receber, manda o que está na fila.
    const conferir = () => {
      if (document.visibilityState === "visible") void baixar();
    };
    const relogio = setInterval(conferir, INTERVALO_ABERTO);
    const aoVoltar = () => void escoar().then(() => baixar());
    window.addEventListener("online", aoVoltar);
    document.addEventListener("visibilitychange", conferir);

    return () => {
      clearInterval(relogio);
      window.removeEventListener("online", aoVoltar);
      document.removeEventListener("visibilitychange", conferir);
    };
  }, [liberado, baixar, escoar]);

  /* ---------- ações ---------- */

  const enviarEsteAparelho = useCallback(async () => {
    if (!temNuvem) return false;
    enfileirar(operacoesDeTudo(dbRef.current));
    await escoar();
    const deu = fila.current.length === 0;
    if (deu) {
      setBancoVazio(false);
      await baixar();
    }
    return deu;
  }, [baixar, enfileirar, escoar]);

  const reset = useCallback(() => {
    set(() => semente());
  }, [set]);

  const exportar = useCallback(
    () => JSON.stringify(dbRef.current, null, 2),
    [],
  );

  const importar = useCallback(
    (json: string) => {
      try {
        const dado = JSON.parse(json) as DB;
        if (!dado || typeof dado !== "object" || !Array.isArray(dado.pontos))
          return false;
        const base = semente();
        set(() => ({
          ...base,
          ...dado,
          config: { ...base.config, ...(dado.config || {}) },
        }));
        return true;
      } catch {
        return false;
      }
    },
    [set],
  );

  const valor = useMemo(
    () => ({
      db,
      set,
      reset,
      importar,
      exportar,
      temNuvem,
      exigeSenha,
      entrou,
      sessaoConhecida,
      estado,
      pendentes,
      entrar,
      sair,
      enviarEsteAparelho,
      bancoVazio,
    }),
    [
      db,
      set,
      reset,
      importar,
      exportar,
      entrou,
      sessaoConhecida,
      estado,
      pendentes,
      entrar,
      sair,
      enviarEsteAparelho,
      bancoVazio,
    ],
  );

  return <StoreCtx.Provider value={valor}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}
