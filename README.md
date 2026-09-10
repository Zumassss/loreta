# Loreta · Caixa

Sistema de gestão financeira da **Loreta Doceria Artesanal** — feito pra Julia Potkul
administrar tudo que entra e tudo que sai da confeitaria — no celular e no computador.

Identidade visual tirada do próprio cardápio da Loreta: listras azul-claro, vinho
`#67130F`, creme e o pêssego dos destaques, com a bonequinha da marca piscando na
abertura.

## Como rodar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera a pasta dist/ pronta pra publicar
npm run preview  # confere o build local
```

O app é 100% estático (React + Vite). A pasta `dist/` pode ser publicada em qualquer
lugar — Vercel, Netlify, GitHub Pages.

No celular, abra o site e use **"Adicionar à tela de início"**: ele abre em tela cheia,
sem barra do navegador, igual a um aplicativo. No computador (a partir de 900px de
largura) o mesmo app vira um painel com menu lateral e conteúdo em duas colunas.

## O que o app faz

| Aba | Pra que serve |
| --- | --- |
| **Início** | Caixa da Loreta, faturamento e lucro do mês, quanto a Julia pode tirar, meta, últimos 6 meses, ranking de pontos e sabores |
| **Vendas** | Lançar o dia: ponto de venda, faturamento total e cada brownie vendido com o preço que saiu (o mesmo sabor pode entrar várias vezes, com preços diferentes) |
| **Custos** | Ingredientes com preço de pacote → receita de cada sabor → custo por brownie e preço sugerido |
| **Caixa** | Saldo real, os três potinhos, DRE do período, ponto de equilíbrio, gastos, retiradas da Julia e o guia rápido do dinheiro |
| **Ajustes** | Pontos de venda, sabores, divisão do lucro, meta, custo fixo, margem alvo, planilha do Excel e backup |

## Planilha do Excel

Em Ajustes → Planilha o app monta um `.xlsx` com a identidade da Loreta: capa com a
logo e a bonequinha, cabeçalhos em vinho, listras azuis e valores em R$. São nove
abas — Resumo, Vendas, Brownies vendidos, Pontos de venda, Sabores, Custo dos
brownies, Ingredientes, Gastos e Retiradas da Julia.

A biblioteca que gera o arquivo (`exceljs`) só é baixada no momento do clique, então
ela não pesa no carregamento do app.

## O método financeiro

O app separa duas coisas que costumam se misturar em negócio pequeno:

1. **Resultado (dá ou não dá lucro)**
   `Faturamento − custo dos brownies vendidos (CMV) − taxas dos pontos − custos fixos = Lucro`

2. **Caixa (quanto tem de dinheiro agora)**
   `Vendas − gastos pagos − retiradas da Julia = Saldo`

O lucro é dividido em **três potinhos** (percentuais configuráveis em Ajustes):

- **60% Julia** — pró-labore + lucro da dona
- **25% Giro** — repor ingredientes e aumentar a produção
- **15% Reserva** — imprevisto, equipamento, crescimento

O caixa nunca deve ficar abaixo do valor de uma fornada inteira: é ele que compra a
próxima leva. Por isso o app avisa quando a retirada passa da cota da Julia.

Preço sugerido de venda: `custo ÷ (1 − margem alvo)`, com a margem alvo padrão em 60%
(um brownie de R$ 4 de custo deveria sair por R$ 10).

## Onde os dados ficam

O app funciona de dois jeitos, dependendo de ter ou não o banco ligado:

| | Sem banco | Com banco (Supabase) |
| --- | --- | --- |
| Onde salva | só no aparelho de quem usou | no banco da Loreta |
| Outro celular | vê números diferentes | vê o mesmo saldo e o mesmo histórico |
| Ao vivo | — | uma venda lançada aparece no outro aparelho na hora |
| Sem internet | funciona | funciona; o lançamento fica na fila e sobe sozinho depois |
| Entrada | direto | senha da Loreta |

Nos dois casos o aparelho guarda uma cópia local, então o app abre instantâneo e
continua funcionando sem sinal. Em Ajustes → Seus dados dá pra baixar um backup em
JSON a qualquer momento.

## Ligar o banco (uma vez, ~10 minutos)

> **Já ligou o Supabase pelo painel da Vercel?** Então os passos 1 e 5 já estão
> feitos: a Vercel criou o projeto e colocou as variáveis sozinha. O build aceita
> os nomes dela (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_…`), não precisa
> renomear nada. Faltam os passos 2 e 3 — as tabelas e a conta —, que a integração
> não tem como criar. Para abrir o painel do Supabase: Vercel → *Storage* → o
> Supabase que você criou → *Open in Supabase*.

1. **Criar o projeto** — em [supabase.com](https://supabase.com), *New project*.
   Escolha a região `South America (São Paulo)` e guarde a senha do banco.
2. **Criar as tabelas** — no menu *SQL Editor*, cole todo o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Isso cria as
   tabelas, tranca o acesso (só quem entrar com a senha lê ou escreve) e liga o
   tempo real.
3. **Criar a conta da Loreta** — em *Authentication → Users → Add user*:
   - e-mail: `caixa@loreta.app`
   - senha: a senha que vocês vão usar pra entrar no site
   - marque **Auto Confirm User**
4. **Pegar as chaves** — em *Project Settings → API*, copie a **Project URL** e a
   chave **anon public**.
5. **Colocar as chaves no site** — na Vercel, *Settings → Environment Variables*:
   - `VITE_SUPABASE_URL` = a Project URL
   - `VITE_SUPABASE_ANON_KEY` = a chave anon public

   Depois faça um *Redeploy* (as variáveis entram no build).

O log do deploy diz em qual estado o site subiu: `[Loreta] banco ligado em …` ou
`[Loreta] sem banco…`. Se a chave `service_role` for colocada por engano no lugar
da `anon`, o build para com erro em vez de publicar — essa chave passa por cima de
toda a segurança do banco e não pode ir pro navegador.

Pronto: o site passa a pedir a senha e todo mundo que entrar vê o mesmo caixa.
Na primeira vez, abra Ajustes → Sincronização e toque em **Enviar deste aparelho**
pra mandar pro banco o que você já tinha lançado.

A chave `anon` pode aparecer no código do site sem problema — ela sozinha não abre
nada, porque as regras do banco (RLS) exigem login. O que não pode vazar é a senha
da Loreta e a chave `service_role` (essa nunca entra no site).

### Primeiro acesso com o banco recém-criado

Quando o banco ainda está vazio, o aparelho que entra primeiro **semeia** ele com
os pontos de venda, os sabores e as configurações — em vez de ser apagado por ele.
Os cadastros iniciais usam ids derivados do nome (`ponto-ufes`, `sabor-snickers`),
então se os dois celulares fizerem isso ao mesmo tempo as linhas são idênticas e
nada duplica.

### Como a sincronização funciona por dentro

A tela continua trabalhando com um único objeto `DB`. O `store` compara o antes e o
depois desse objeto a cada mudança e manda pro banco **só a linha que mudou** —
venda por venda, gasto por gasto. Não existe "salvar o arquivo inteiro", então dois
celulares podem lançar ao mesmo tempo sem um apagar o trabalho do outro.

O que não conseguiu subir fica numa fila no aparelho (`loreta.fila.v1`) e é reenviado
quando a internet volta. Um canal de tempo real avisa os outros aparelhos, que
recarregam sozinhos.

## Estrutura

```
src/
  lib/
    types.ts     modelo de dados
    finance.ts   custos, CMV, DRE, divisão do lucro, ponto de equilíbrio
    store.tsx    estado global, cópia local e sincronização
    format.ts    moeda, datas, parsing de valores digitados
    excel.ts     geração da planilha .xlsx da marca
    supabase.ts  cliente do banco (opcional)
    nuvem.ts     o que mudou -> o que mandar pro banco, e a fila de envio
    tela.ts      mede a área visível de verdade (teclado, barras do navegador)
  components/    splash, bonequinha, sheet, campos, ícones
  screens/       Início, Vendas, Custos, Caixa, Ajustes
  styles/        sistema visual da marca
public/          bonequinha, logo e ícones extraídos do cardápio
supabase/
  schema.sql     tabelas, permissões e tempo real
```
