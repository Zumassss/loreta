import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * A Vercel, quando a gente liga o Supabase pelo painel de Storage, cria as
 * variáveis sozinha — mas com os nomes dela (SUPABASE_URL, NEXT_PUBLIC_...).
 * O Vite só entrega pro navegador o que começa com VITE_, então aqui a gente
 * aceita qualquer um desses nomes e injeta no app na hora do build.
 *
 * De propósito só a URL e a chave pública (anon) entram. A service_role NUNCA
 * é injetada: ela ignora as regras de segurança do banco e não pode aparecer
 * no código que vai pro navegador.
 */
const primeiro = (fontes: Record<string, string>, nomes: string[]) => {
  for (const nome of nomes) {
    const valor = fontes[nome];
    if (valor && valor.trim()) return valor.trim();
  }
  return "";
};

/** a chave service_role passa por cima de toda a segurança do banco — se ela
    aparecer por engano no lugar da anon, o build recusa em vez de publicar */
const ehServiceRole = (chave: string) => {
  try {
    const meio = chave.split(".")[1];
    if (!meio) return false;
    const texto = Buffer.from(
      meio.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return JSON.parse(texto).role === "service_role";
  } catch {
    return false;
  }
};

export default defineConfig(({ mode }) => {
  const ambiente = {
    ...loadEnv(mode, process.cwd(), ""),
    ...process.env,
  } as Record<string, string>;

  const url = primeiro(ambiente, [
    "VITE_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_NEXT_PUBLIC_SUPABASE_URL",
  ]);

  const chave = primeiro(ambiente, [
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]);

  const email =
    primeiro(ambiente, ["VITE_LORETA_EMAIL", "LORETA_EMAIL"]) ||
    "caixa@loreta.app";

  if (chave && ehServiceRole(chave)) {
    throw new Error(
      "[Loreta] a chave informada é a service_role, que abre o banco inteiro e não pode " +
        'ir pro navegador. Use a chave "anon public" do Supabase.',
    );
  }

  // aparece no log do deploy pra ficar fácil conferir se as chaves chegaram
  console.log(
    url && chave
      ? `[Loreta] banco ligado em ${url.replace(/^https?:\/\//, "")} (conta ${email})`
      : "[Loreta] sem banco: o app vai guardar os dados só no aparelho de quem usar",
  );

  return {
    plugins: [react()],
    base: "./",
    define: {
      __LORETA_URL__: JSON.stringify(url),
      __LORETA_CHAVE__: JSON.stringify(chave),
      __LORETA_EMAIL__: JSON.stringify(email),
    },
  };
});
