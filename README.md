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

Tudo é salvo no **próprio aparelho** (localStorage do navegador) — não vai pra
servidor nenhum. Em Ajustes → Seus dados dá pra baixar um backup em JSON e restaurar
depois, inclusive em outro celular.

## Estrutura

```
src/
  lib/
    types.ts     modelo de dados
    finance.ts   custos, CMV, DRE, divisão do lucro, ponto de equilíbrio
    store.tsx    estado global + localStorage
    format.ts    moeda, datas, parsing de valores digitados
    excel.ts     geração da planilha .xlsx da marca
  components/    splash, bonequinha, sheet, campos, ícones
  screens/       Início, Vendas, Custos, Caixa, Ajustes
  styles/        sistema visual da marca
public/          bonequinha, logo e ícones extraídos do cardápio
```
