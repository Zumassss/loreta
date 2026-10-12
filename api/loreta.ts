/**
 * Ponte entre o app da Loreta e o banco (Neon, ligado pelo painel da Vercel).
 *
 * O navegador nunca vê a senha do banco: ele chama /api/loreta e esta função,
 * que roda no servidor da Vercel, é quem conversa com o Postgres.
 *
 *   GET  /api/loreta              -> todas as tabelas de uma vez
 *   POST /api/loreta  {operação}  -> grava (upsert) ou apaga linhas
 *
 * Só as sete tabelas do caixa e só as colunas conhecidas passam: o resto é
 * recusado antes de chegar no banco.
 *
 * Senha da casa (opcional): se a variável LORETA_SENHA_DA_CASA existir na
 * Vercel, toda chamada precisa mandar a mesma senha no cabeçalho
 * `x-loreta-senha`. Sem ela, o site abre direto, como a Julia pediu.
 */
import { neon } from "@neondatabase/serverless";
import { timingSafeEqual } from "node:crypto";

/* A integração da Vercel com o Neon cria as variáveis com o prefixo do nome
   do banco ("bancoloreta_"). De propósito NÃO lemos POSTGRES_URL: esse nome
   ainda aponta pro Supabase antigo. */
const URL_DO_BANCO =
  process.env.bancoloreta_DATABASE_URL ||
  process.env.LORETA_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "";

const COLUNAS: Record<string, string[]> = {
  pontos: ["id", "nome", "ativo", "taxa_pct"],
  sabores: [
    "id",
    "nome",
    "ativo",
    "rendimento",
    "itens",
    "extras",
    "custo_manual",
    "preco_sugerido",
  ],
  ingredientes: ["id", "nome", "preco_pacote", "qtd_pacote", "unidade"],
  vendas: [
    "id",
    "data",
    "ponto_id",
    "total_informado",
    "itens",
    "obs",
    "criado_em",
  ],
  despesas: ["id", "data", "categoria", "descricao", "valor"],
  retiradas: ["id", "data", "valor", "obs"],
  config: [
    "id",
    "split_julia",
    "split_giro",
    "split_reserva",
    "meta_mensal",
    "custo_fixo_mensal",
    "margem_alvo",
  ],
};

const MAX_LINHAS = 5000;

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function senhaConfere(request: Request): boolean {
  const senha = process.env.LORETA_SENHA_DA_CASA;
  if (!senha) return true;
  const veio = request.headers.get("x-loreta-senha") ?? "";
  const a = Buffer.from(veio);
  const b = Buffer.from(senha);
  return a.length === b.length && timingSafeEqual(a, b);
}

function banco() {
  if (!URL_DO_BANCO) throw new Error("banco não configurado");
  return neon(URL_DO_BANCO);
}

export async function GET(request: Request) {
  if (!senhaConfere(request))
    return resposta({ erro: "Senha errada." }, 401);
  try {
    const sql = banco();
    // json_agg devolve data como "2026-10-02" e número como número — o mesmo
    // formato que o app já recebia do Supabase.
    const [linha] = await sql.query(
      `select
         (select coalesce(json_agg(t), '[]') from public.pontos t)       as pontos,
         (select coalesce(json_agg(t), '[]') from public.sabores t)      as sabores,
         (select coalesce(json_agg(t), '[]') from public.ingredientes t) as ingredientes,
         (select coalesce(json_agg(t), '[]') from public.vendas t)       as vendas,
         (select coalesce(json_agg(t), '[]') from public.despesas t)     as despesas,
         (select coalesce(json_agg(t), '[]') from public.retiradas t)    as retiradas,
         (select row_to_json(t) from public.config t where id = 1)       as config`,
    );
    return resposta(linha);
  } catch (erro) {
    console.error("[loreta] leitura falhou", erro);
    return resposta({ erro: "Não deu pra ler o banco agora." }, 503);
  }
}

interface Operacao {
  tipo?: unknown;
  tabela?: unknown;
  linhas?: unknown;
  ids?: unknown;
}

export async function POST(request: Request) {
  // pedido de outro site não manda este cabeçalho (e o JSON força preflight)
  if (request.headers.get("x-loreta") !== "1")
    return resposta({ erro: "Pedido recusado." }, 403);
  if (!senhaConfere(request))
    return resposta({ erro: "Senha errada." }, 401);

  let op: Operacao;
  try {
    op = (await request.json()) as Operacao;
  } catch {
    return resposta({ erro: "Corpo inválido." }, 400);
  }

  const tabela = typeof op.tabela === "string" ? op.tabela : "";
  const colunas = COLUNAS[tabela];
  if (!colunas) return resposta({ erro: "Tabela desconhecida." }, 400);

  try {
    const sql = banco();

    if (op.tipo === "delete") {
      if (tabela === "config")
        return resposta({ erro: "A configuração não se apaga." }, 400);
      const ids = Array.isArray(op.ids)
        ? op.ids.filter((x): x is string => typeof x === "string")
        : [];
      if (!ids.length || ids.length > MAX_LINHAS)
        return resposta({ erro: "Lista de ids inválida." }, 400);
      await sql.query(`delete from public.${tabela} where id = any($1::text[])`, [
        ids,
      ]);
      return resposta({ ok: true });
    }

    if (op.tipo === "upsert" || op.tipo === "config") {
      const linhas = Array.isArray(op.linhas) ? op.linhas : [];
      if (!linhas.length || linhas.length > MAX_LINHAS)
        return resposta({ erro: "Nenhuma linha pra gravar." }, 400);
      if (
        !linhas.every(
          (l) =>
            l &&
            typeof l === "object" &&
            !Array.isArray(l) &&
            (tabela === "config"
              ? (l as Record<string, unknown>).id === 1
              : typeof (l as Record<string, unknown>).id === "string"),
        )
      )
        return resposta({ erro: "Linha sem id." }, 400);

      // só as colunas conhecidas; nomes vêm da lista fixa acima, nunca do pedido
      const limpas = linhas.map((l) => {
        const r = l as Record<string, unknown>;
        return Object.fromEntries(
          colunas.filter((c) => c in r).map((c) => [c, r[c]]),
        );
      });
      const presentes = colunas.filter((c) =>
        limpas.some((l) => c in l),
      );
      const lista = presentes.join(", ");
      const atualiza = presentes
        .filter((c) => c !== "id")
        .map((c) => `${c} = excluded.${c}`)
        .concat("atualizado_em = now()")
        .join(", ");

      await sql.query(
        `insert into public.${tabela} (${lista})
         select ${lista} from jsonb_populate_recordset(null::public.${tabela}, $1::jsonb)
         on conflict (id) do update set ${atualiza}`,
        [JSON.stringify(limpas)],
      );
      return resposta({ ok: true });
    }

    return resposta({ erro: "Operação desconhecida." }, 400);
  } catch (erro) {
    console.error("[loreta] gravação falhou", tabela, erro);
    return resposta({ erro: "Não deu pra gravar agora." }, 503);
  }
}
