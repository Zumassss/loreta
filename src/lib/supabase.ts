import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** o app funciona sem banco (só neste aparelho) — a nuvem é opcional */
export const temNuvem = Boolean(url && chave)

/** e-mail da conta única da Loreta; a senha é que é o segredo */
export const emailDaCasa =
  (import.meta.env.VITE_LORETA_EMAIL as string | undefined) || 'caixa@loreta.app'

export const supabase: SupabaseClient | null = temNuvem
  ? createClient(url!, chave!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
