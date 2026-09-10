import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Valores colocados no build pelo vite.config.ts — ele aceita tanto os nomes
   VITE_… quanto os que a Vercel cria sozinha ao ligar o Supabase. */
declare const __LORETA_URL__: string;
declare const __LORETA_CHAVE__: string;
declare const __LORETA_EMAIL__: string;

const url = __LORETA_URL__;
const chave = __LORETA_CHAVE__;

/** o app funciona sem banco (só neste aparelho) — a nuvem é opcional */
export const temNuvem = Boolean(url && chave);

/** e-mail da conta única da Loreta; a senha é que é o segredo */
export const emailDaCasa = __LORETA_EMAIL__ || "caixa@loreta.app";

export const supabase: SupabaseClient | null = temNuvem
  ? createClient(url, chave, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
