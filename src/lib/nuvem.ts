/**
 * Sincronização com o banco (Supabase).
 *
 * A ideia: a tela continua trabalhando com um único objeto `DB`, igual antes.
 * Aqui a gente compara o antes/depois desse objeto e manda pro banco só o que
 * mudou — venda por venda, gasto por gasto. Nada de sobrescrever o arquivo
 * inteiro, então dois celulares podem lançar ao mesmo tempo sem um apagar o
 * outro.
 */
import type {
  Config,
  DB,
  Despesa,
  Ingrediente,
  Ponto,
  Retirada,
  Sabor,
  Unidade,
  Venda,
} from "./types";
import { supabase } from "./supabase";

type Linha = Record<string, unknown>;
const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const t = (v: unknown) => (v === null || v === undefined ? "" : String(v));

interface Colecao<T extends { id: string }> {
  tabela: string;
  paraLinha: (x: T) => Linha;
  daLinha: (r: Linha) => T;
}

const pontos: Colecao<Ponto> = {
  tabela: "pontos",
  paraLinha: (p) => ({
    id: p.id,
    nome: p.nome,
    ativo: p.ativo,
    taxa_pct: p.taxaPct,
  }),
  daLinha: (r) => ({
    id: t(r.id),
    nome: t(r.nome),
    ativo: r.ativo !== false,
    taxaPct: n(r.taxa_pct),
  }),
};

const sabores: Colecao<Sabor> = {
  tabela: "sabores",
  paraLinha: (s) => ({
    id: s.id,
    nome: s.nome,
    ativo: s.ativo,
    rendimento: s.rendimento,
    itens: s.itens,
    extras: s.extras,
    custo_manual: s.custoManual ?? null,
    preco_sugerido: s.precoSugerido ?? null,
  }),
  daLinha: (r) => ({
    id: t(r.id),
    nome: t(r.nome),
    ativo: r.ativo !== false,
    rendimento: n(r.rendimento),
    itens: (r.itens as Sabor["itens"]) ?? [],
    extras: (r.extras as Sabor["extras"]) ?? [],
    custoManual: r.custo_manual === null ? undefined : n(r.custo_manual),
    precoSugerido: r.preco_sugerido === null ? undefined : n(r.preco_sugerido),
  }),
};

const ingredientes: Colecao<Ingrediente> = {
  tabela: "ingredientes",
  paraLinha: (i) => ({
    id: i.id,
    nome: i.nome,
    preco_pacote: i.precoPacote,
    qtd_pacote: i.qtdPacote,
    unidade: i.unidade,
  }),
  daLinha: (r) => ({
    id: t(r.id),
    nome: t(r.nome),
    precoPacote: n(r.preco_pacote),
    qtdPacote: n(r.qtd_pacote),
    unidade: t(r.unidade) as Unidade,
  }),
};

const vendas: Colecao<Venda> = {
  tabela: "vendas",
  paraLinha: (v) => ({
    id: v.id,
    data: v.data,
    ponto_id: v.pontoId,
    total_informado: v.totalInformado,
    itens: v.itens,
    obs: v.obs ?? "",
    criado_em: v.criadoEm,
  }),
  daLinha: (r) => ({
    id: t(r.id),
    data: t(r.data),
    pontoId: t(r.ponto_id),
    totalInformado: n(r.total_informado),
    itens: (r.itens as Venda["itens"]) ?? [],
    obs: t(r.obs),
    criadoEm: n(r.criado_em),
  }),
};

const despesas: Colecao<Despesa> = {
  tabela: "despesas",
  paraLinha: (d) => ({
    id: d.id,
    data: d.data,
    categoria: d.categoria,
    descricao: d.descricao,
    valor: d.valor,
  }),
  daLinha: (r) => ({
    id: t(r.id),
    data: t(r.data),
    categoria: t(r.categoria) as Despesa["categoria"],
    descricao: t(r.descricao),
    valor: n(r.valor),
  }),
};

const retiradas: Colecao<Retirada> = {
  tabela: "retiradas",
  paraLinha: (r) => ({
    id: r.id,
    data: r.data,
    valor: r.valor,
    obs: r.obs ?? "",
  }),
  daLinha: (r) => ({
    id: t(r.id),
    data: t(r.data),
    valor: n(r.valor),
    obs: t(r.obs),
  }),
};

export const COLECOES = {
  pontos,
  sabores,
  ingredientes,
  vendas,
  despesas,
  retiradas,
};
type NomeColecao = keyof typeof COLECOES;

/** a mesma coleção vista de forma genérica, pra percorrer todas em um laço */
const generica = (nome: NomeColecao) =>
  COLECOES[nome] as unknown as Colecao<{ id: string }>;

const configParaLinha = (c: Config): Linha => ({
  id: 1,
  split_julia: c.splitJulia,
  split_giro: c.splitGiro,
  split_reserva: c.splitReserva,
  meta_mensal: c.metaMensal,
  custo_fixo_mensal: c.custoFixoMensal,
  margem_alvo: c.margemAlvo,
});

const configDaLinha = (r: Linha): Config => ({
  splitJulia: n(r.split_julia),
  splitGiro: n(r.split_giro),
  splitReserva: n(r.split_reserva),
  metaMensal: n(r.meta_mensal),
  custoFixoMensal: n(r.custo_fixo_mensal),
  margemAlvo: n(r.margem_alvo),
});

/* ---------------------------------------------------------------
   O que mudou de um estado pro outro
   --------------------------------------------------------------- */

export interface Operacao {
  tipo: "upsert" | "delete" | "config";
  tabela: string;
  linhas?: Linha[];
  ids?: string[];
}

function diferenca<T extends { id: string }>(
  antes: T[],
  depois: T[],
  col: Colecao<T>,
) {
  const ops: Operacao[] = [];
  const mapaAntes = new Map(antes.map((x) => [x.id, JSON.stringify(x)]));
  const idsDepois = new Set(depois.map((x) => x.id));

  const mudaram = depois.filter(
    (x) => mapaAntes.get(x.id) !== JSON.stringify(x),
  );
  if (mudaram.length)
    ops.push({
      tipo: "upsert",
      tabela: col.tabela,
      linhas: mudaram.map(col.paraLinha),
    });

  const sumiram = antes.filter((x) => !idsDepois.has(x.id)).map((x) => x.id);
  if (sumiram.length)
    ops.push({ tipo: "delete", tabela: col.tabela, ids: sumiram });

  return ops;
}

/** lista de operações que levam o banco do estado `antes` pro estado `depois` */
export function operacoesEntre(antes: DB, depois: DB): Operacao[] {
  const ops: Operacao[] = [];
  for (const nome of Object.keys(COLECOES) as NomeColecao[]) {
    ops.push(
      ...diferenca(
        antes[nome] as { id: string }[],
        depois[nome] as { id: string }[],
        generica(nome),
      ),
    );
  }
  if (JSON.stringify(antes.config) !== JSON.stringify(depois.config))
    ops.push({
      tipo: "config",
      tabela: "config",
      linhas: [configParaLinha(depois.config)],
    });
  return ops;
}

/** todas as linhas do estado atual — usado pra subir o aparelho inteiro */
export function operacoesDeTudo(db: DB): Operacao[] {
  const ops: Operacao[] = [];
  for (const nome of Object.keys(COLECOES) as NomeColecao[]) {
    const col = generica(nome);
    const lista = db[nome] as { id: string }[];
    if (lista.length)
      ops.push({
        tipo: "upsert",
        tabela: col.tabela,
        linhas: lista.map(col.paraLinha),
      });
  }
  ops.push({
    tipo: "config",
    tabela: "config",
    linhas: [configParaLinha(db.config)],
  });
  return ops;
}

/* ---------------------------------------------------------------
   Conversa com o banco
   --------------------------------------------------------------- */

export async function aplicar(op: Operacao): Promise<void> {
  if (!supabase) throw new Error("sem nuvem");
  if (op.tipo === "delete") {
    const { error } = await supabase
      .from(op.tabela)
      .delete()
      .in("id", op.ids ?? []);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from(op.tabela).upsert(op.linhas ?? []);
  if (error) throw error;
}

export async function baixarTudo(base: DB): Promise<DB> {
  const sb = supabase;
  if (!sb) throw new Error("sem nuvem");
  const nomes = Object.keys(COLECOES) as NomeColecao[];
  const respostas = await Promise.all([
    ...nomes.map((nome) => sb.from(COLECOES[nome].tabela).select("*")),
    sb.from("config").select("*").eq("id", 1).maybeSingle(),
  ]);

  const erro = respostas.find((r) => r.error);
  if (erro?.error) throw erro.error;

  const novo: DB = { ...base };
  nomes.forEach((nome, i) => {
    const linhas = (respostas[i].data as Linha[]) ?? [];
    Object.assign(novo, { [nome]: linhas.map(generica(nome).daLinha) });
  });
  const linhaConfig = respostas[nomes.length].data as Linha | null;
  novo.config = linhaConfig ? configDaLinha(linhaConfig) : base.config;
  return novo;
}

/* ---------------------------------------------------------------
   Fila de envio — o que ainda não subiu fica guardado no aparelho
   --------------------------------------------------------------- */

const CHAVE_FILA = "loreta.fila.v1";

export function lerFila(): Operacao[] {
  try {
    const bruto = localStorage.getItem(CHAVE_FILA);
    return bruto ? (JSON.parse(bruto) as Operacao[]) : [];
  } catch {
    return [];
  }
}

export function gravarFila(ops: Operacao[]) {
  try {
    if (ops.length) localStorage.setItem(CHAVE_FILA, JSON.stringify(ops));
    else localStorage.removeItem(CHAVE_FILA);
  } catch {
    /* sem espaço: as operações seguem só em memória */
  }
}

/** o banco está zerado? (nenhum lançamento e nenhum cadastro) */
export function estaVazio(db: DB) {
  return (
    db.vendas.length === 0 &&
    db.despesas.length === 0 &&
    db.retiradas.length === 0 &&
    db.ingredientes.length === 0 &&
    db.pontos.length === 0 &&
    db.sabores.length === 0
  );
}
