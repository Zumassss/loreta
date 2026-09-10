-- ============================================================
-- Loreta · Caixa — banco de dados
-- Cole tudo isto no SQL Editor do Supabase e clique em RUN.
-- Pode rodar de novo sem medo: nada é apagado.
-- ============================================================

create table if not exists public.pontos (
  id            text primary key,
  nome          text        not null,
  ativo         boolean     not null default true,
  taxa_pct      numeric     not null default 0,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.sabores (
  id             text primary key,
  nome           text        not null,
  ativo          boolean     not null default true,
  rendimento     integer     not null default 0,
  itens          jsonb       not null default '[]'::jsonb,
  extras         jsonb       not null default '[]'::jsonb,
  custo_manual   numeric,
  preco_sugerido numeric,
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.ingredientes (
  id            text primary key,
  nome          text        not null,
  preco_pacote  numeric     not null default 0,
  qtd_pacote    numeric     not null default 0,
  unidade       text        not null default 'g',
  atualizado_em timestamptz not null default now()
);

create table if not exists public.vendas (
  id              text primary key,
  data            date        not null,
  ponto_id        text        not null,
  total_informado numeric     not null default 0,
  itens           jsonb       not null default '[]'::jsonb,
  obs             text        not null default '',
  criado_em       bigint      not null default 0,
  atualizado_em   timestamptz not null default now()
);

create table if not exists public.despesas (
  id            text primary key,
  data          date        not null,
  categoria     text        not null default 'outros',
  descricao     text        not null default '',
  valor         numeric     not null default 0,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.retiradas (
  id            text primary key,
  data          date        not null,
  valor         numeric     not null default 0,
  obs           text        not null default '',
  atualizado_em timestamptz not null default now()
);

create table if not exists public.config (
  id                integer primary key default 1,
  split_julia       numeric not null default 60,
  split_giro        numeric not null default 25,
  split_reserva     numeric not null default 15,
  meta_mensal       numeric not null default 0,
  custo_fixo_mensal numeric not null default 0,
  margem_alvo       numeric not null default 0.6,
  atualizado_em     timestamptz not null default now(),
  constraint config_linha_unica check (id = 1)
);

create index if not exists vendas_data_idx    on public.vendas (data);
create index if not exists despesas_data_idx  on public.despesas (data);
create index if not exists retiradas_data_idx on public.retiradas (data);

-- ============================================================
-- Quem pode mexer: só quem entrou com a senha da Loreta.
-- Visitante sem login não lê e não escreve nada.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'pontos','sabores','ingredientes','vendas','despesas','retiradas','config'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "loreta_leitura" on public.%I', t);
    execute format('drop policy if exists "loreta_escrita" on public.%I', t);
    execute format(
      'create policy "loreta_leitura" on public.%I for select to authenticated using (true)', t
    );
    execute format(
      'create policy "loreta_escrita" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ============================================================
-- Tempo real: uma venda lançada num celular aparece no outro na hora.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'pontos','sabores','ingredientes','vendas','despesas','retiradas','config'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;
