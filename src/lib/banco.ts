/**
 * Conversa com o banco da Loreta.
 *
 * O navegador não fala com o banco direto: ele chama /api/loreta, uma função
 * da Vercel que guarda a senha do banco (Neon) longe do código do site.
 */

/** o app funciona sem banco (só neste aparelho) — a nuvem é opcional */
export const temNuvem = __LORETA_NUVEM__ === true;

/** o site pede a senha da casa? só se LORETA_SENHA_DA_CASA existir na Vercel */
export const exigeSenha = __LORETA_EXIGE_SENHA__ === true;

const CHAVE_SENHA = "loreta.senha.v1";

export function senhaGuardada(): string {
  try {
    return localStorage.getItem(CHAVE_SENHA) ?? "";
  } catch {
    return "";
  }
}

export function guardarSenha(senha: string) {
  try {
    localStorage.setItem(CHAVE_SENHA, senha);
  } catch {
    /* modo privado: vale só enquanto a aba estiver aberta */
  }
}

export function esquecerSenha() {
  try {
    localStorage.removeItem(CHAVE_SENHA);
  } catch {
    /* nada a fazer */
  }
}

/** erro com o status HTTP, pra quem chama saber se foi senha (401) ou rede */
export class ErroBanco extends Error {
  status: number;
  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

export async function chamarBanco<T>(
  metodo: "GET" | "POST",
  corpo?: unknown,
  senha = senhaGuardada(),
): Promise<T> {
  const cabecalhos: Record<string, string> = { "x-loreta": "1" };
  if (senha) cabecalhos["x-loreta-senha"] = senha;
  if (corpo !== undefined) cabecalhos["content-type"] = "application/json";

  const r = await fetch("/api/loreta", {
    method: metodo,
    headers: cabecalhos,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });
  if (!r.ok) {
    let mensagem = `erro ${r.status}`;
    try {
      mensagem = ((await r.json()) as { erro?: string }).erro ?? mensagem;
    } catch {
      /* resposta sem corpo */
    }
    throw new ErroBanco(mensagem, r.status);
  }
  return (await r.json()) as T;
}
