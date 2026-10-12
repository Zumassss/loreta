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

| | Sem banco | Com banco (Neon) |
| --- | --- | --- |
| Onde salva | só no aparelho de quem usou | no banco da Loreta |
| Outro celular | vê números diferentes | vê o mesmo saldo e o mesmo histórico |
| Atualização | — | o app confere o banco a cada 15 s e ao voltar pra tela |
| Sem internet | funciona | funciona; o lançamento fica na fila e sobe sozinho depois |
| Entrada | direto | direto, ou com a senha da casa (opcional) |

Nos dois casos o aparelho guarda uma cópia local, então o app abre instantâneo e
continua funcionando sem sinal. Em Ajustes → Seus dados dá pra baixar um backup em
JSON a qualquer momento.

## O banco (Neon, ligado pela Vercel)

O banco é um Postgres no [Neon](https://neon.tech), ligado pelo painel da Vercel
(*Storage → Neon*). A integração cria sozinha a variável
`bancoloreta_DATABASE_URL` no projeto — não precisa copiar senha nenhuma.

Quem fala com o banco é só a função [`api/loreta.ts`](api/loreta.ts), que roda no
servidor da Vercel:

- `GET /api/loreta` devolve todas as tabelas;
- `POST /api/loreta` grava (upsert) ou apaga linhas de uma tabela.

A URL do banco nunca vai pro navegador: no build entra só um "sim/não" (tem
banco? tem senha?). A função aceita apenas as sete tabelas do caixa e as colunas
conhecidas de cada uma.

Banco novo, do zero: abra o *SQL Editor* do Neon e rode
[`banco/schema.sql`](banco/schema.sql). Na primeira vez que alguém abrir o site,
o aparelho semeia o banco vazio com os pontos, os sabores e as configurações.

O log do deploy diz em qual estado o site subiu: `[Loreta] banco ligado (Neon) …`
ou `[Loreta] sem banco…`.

### Senha da casa (opcional)

Por padrão o site abre direto, sem senha (a Julia pediu assim). Quem tiver o
link vê e altera o caixa. Pra fechar: na Vercel, *Settings → Environment
Variables*, crie `LORETA_SENHA_DA_CASA` com a senha que vocês vão usar e faça
*Redeploy*. O site passa a pedir a senha uma vez em cada aparelho; a função
recusa qualquer chamada sem ela.

### Como a sincronização funciona por dentro

A tela continua trabalhando com um único objeto `DB`. O `store` compara o antes e o
depois desse objeto a cada mudança e manda pro banco **só a linha que mudou** —
venda por venda, gasto por gasto. Não existe "salvar o arquivo inteiro", então dois
celulares podem lançar ao mesmo tempo sem um apagar o trabalho do outro.

O que não conseguiu subir fica numa fila no aparelho (`loreta.fila.v1`) e é reenviado
quando a internet volta. Com a tela aberta, o app confere o banco a cada 15
segundos e na hora em que o celular volta pro app, e antes de receber sempre manda
o que estava na fila.

## Estrutura

```
src/
  lib/
    types.ts     modelo de dados
    finance.ts   custos, CMV, DRE, divisão do lucro, ponto de equilíbrio
    store.tsx    estado global, cópia local e sincronização
    format.ts    moeda, datas, parsing de valores digitados
    excel.ts     geração da planilha .xlsx da marca
    banco.ts     conversa com /api/loreta (opcional)
    nuvem.ts     o que mudou -> o que mandar pro banco, e a fila de envio
    tela.ts      mede a área visível de verdade (teclado, barras do navegador)
  components/    splash, bonequinha, sheet, campos, ícones
  screens/       Início, Vendas, Custos, Caixa, Ajustes
  styles/        sistema visual da marca
public/          bonequinha, logo e ícones extraídos do cardápio
api/
  loreta.ts      função da Vercel que lê e grava no banco (Neon)
banco/
  schema.sql     tabelas do banco
```
