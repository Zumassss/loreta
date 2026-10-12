import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * O banco (Neon) foi ligado pelo painel da Vercel, que cria as variáveis com o
 * prefixo do nome do banco (bancoloreta_DATABASE_URL). Quem usa essa URL é só
 * a função api/loreta.ts, no servidor. Pro navegador vai apenas um "sim/não":
 * existe banco? existe senha da casa? Nenhum valor secreto entra no site.
 */
const tem = (fontes: Record<string, string>, nomes: string[]) =>
  nomes.some((nome) => Boolean(fontes[nome]?.trim()));

export default defineConfig(({ mode }) => {
  const ambiente = {
    ...loadEnv(mode, process.cwd(), ""),
    ...process.env,
  } as Record<string, string>;

  const nuvem = tem(ambiente, [
    "bancoloreta_DATABASE_URL",
    "LORETA_DATABASE_URL",
    "DATABASE_URL",
  ]);

  // Por padrão o site abre direto, sem pedir senha. Para exigir senha, crie a
  // variável LORETA_SENHA_DA_CASA (com a senha) na Vercel e publique de novo.
  const exigeSenha = tem(ambiente, ["LORETA_SENHA_DA_CASA"]);

  // aparece no log do deploy pra ficar fácil conferir se o banco chegou
  console.log(
    nuvem
      ? `[Loreta] banco ligado (Neon) · ${
          exigeSenha ? "entrada com a senha da casa" : "entrada liberada, sem senha"
        }`
      : "[Loreta] sem banco: o app vai guardar os dados só no aparelho de quem usar",
  );

  return {
    plugins: [react()],
    base: "./",
    define: {
      __LORETA_NUVEM__: JSON.stringify(nuvem),
      __LORETA_EXIGE_SENHA__: JSON.stringify(exigeSenha),
    },
  };
});
