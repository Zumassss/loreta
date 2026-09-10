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
import { id } from "./format";
import { emailDaCasa, supabase, temNuvem } from "./supabase";
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
  ].map((nome) => ({ id: id(), nome, ativo: true, taxaPct: 0 })),
  sabores: [
    "Ninho com Nutella",
    "Snickers",
    "Maracujá",
    "Tradicional",
    "Doce de Leite",
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
  const [entrou, setEntrou] = useState(false);
  const [sessaoConhecida, setSessaoConhecida] = useState(!temNuvem);
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

  useEffect(() => {
    if (!supabase) return;
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setEntrou(Boolean(data.session));
      setSessaoConhecida(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, sessao) => {
      setEntrou(Boolean(sessao));
      setSessaoConhecida(true);
    });
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const entrar = useCallback(async (senha: string) => {
    if (!supabase) return "Este site ainda não está ligado no banco.";
    const { error } = await supabase.auth.signInWithPassword({
      email: emailDaCasa,
      password: senha,
    });
    if (error) return "Senha errada — tente de novo.";
    return null;
  }, []);

  const sair = useCallback(async () => {
    await supabase?.auth.signOut();
    setEntrou(false);
  }, []);

  /* ---------- carregar do banco + tempo real ---------- */

  const baixar = useCallback(async () => {
    if (!temNuvem) return;
    // enquanto houver coisa pra subir, o aparelho manda antes de receber
    if (fila.current.length) {
      await escoar();
      if (fila.current.length) return;
    }
    try {
      const remoto = await baixarTudo(dbRef.current);
      setBancoVazio(estaVazio(remoto));
      aplicarLocal(remoto);
      setEstado("sincronizado");
    } catch {
      setEstado("offline");
    }
  }, [aplicarLocal, escoar]);

  useEffect(() => {
    const sb = supabase;
    if (!temNuvem || !entrou || !sb) return;
    let vivo = true;
    let debounce: ReturnType<typeof setTimeout> | undefined;

    setEstado("carregando");
    void baixar();

    const canal = sb
      .channel("loreta-caixa")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        if (!vivo) return;
        clearTimeout(debounce);
        debounce = setTimeout(() => void baixar(), 400);
      })
      .subscribe();

    const aoVoltar = () => void escoar().then(() => baixar());
    window.addEventListener("online", aoVoltar);
    const relogio = setInterval(() => {
      if (fila.current.length) void escoar();
    }, 20000);

    return () => {
      vivo = false;
      clearTimeout(debounce);
      clearInterval(relogio);
      window.removeEventListener("online", aoVoltar);
      void sb.removeChannel(canal);
    };
  }, [entrou, baixar, escoar]);

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
