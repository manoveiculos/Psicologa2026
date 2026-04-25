-- Migration: schema inicial do projeto Psicolaga.
-- Todas as tabelas levam o sufixo _psicologa para coexistir com outros
-- projetos no mesmo Supabase (jkblxdxnbmciicakusnl).

create extension if not exists pgcrypto;

-- =============== patients_psicologa ===============
create table if not exists public.patients_psicologa (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  nome            text not null,
  telefone_e164   text,
  tipo_default    text not null check (tipo_default in ('particular','plano')) default 'particular',
  convenio        text,
  valor_sessao_default numeric(10,2),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_patients_psicologa_user on public.patients_psicologa(user_id);

-- =============== appointments_psicologa ===============
create table if not exists public.appointments_psicologa (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  google_event_id     text not null,
  patient_id          uuid references public.patients_psicologa(id) on delete set null,
  inicio              timestamptz not null,
  fim                 timestamptz not null,
  tipo                text not null check (tipo in ('particular','plano','bloqueio','pessoal')) default 'particular',
  valor_bruto         numeric(10,2),
  percentual_clinica  numeric(5,2) not null default 0,
  status              text not null check (status in ('agendado','realizado','faltou','cancelado')) default 'agendado',
  prontuario_status   text not null check (prontuario_status in ('pendente','feito','nao_aplicavel')) default 'pendente',
  prontuario_cipher   bytea,
  lembrete_enviado_em timestamptz,
  titulo_calendar     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, google_event_id)
);
create index if not exists idx_appointments_psicologa_user_inicio on public.appointments_psicologa(user_id, inicio);
create index if not exists idx_appointments_psicologa_lembrete on public.appointments_psicologa(user_id, inicio)
  where lembrete_enviado_em is null;

-- =============== expenses_psicologa ===============
create table if not exists public.expenses_psicologa (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        date not null,
  categoria   text not null check (categoria in ('aluguel','supervisao','imposto','material','outros')),
  descricao   text,
  valor       numeric(10,2) not null,
  recorrencia text not null check (recorrencia in ('unica','mensal')) default 'unica',
  created_at  timestamptz not null default now()
);
create index if not exists idx_expenses_psicologa_user_data on public.expenses_psicologa(user_id, data);

-- =============== settings_psicologa ===============
create table if not exists public.settings_psicologa (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  horario_trabalho        jsonb not null default '{"1":[["09:00","18:00"]],"2":[["09:00","18:00"]],"3":[["09:00","18:00"]],"4":[["09:00","18:00"]],"5":[["09:00","18:00"]]}'::jsonb,
  duracao_sessao_minutos  int not null default 50,
  aliquota_imposto        numeric(5,2) not null default 0,
  google_refresh_token    text,
  google_sync_token       text,
  google_calendar_id      text default 'primary',
  evolution_url           text,
  evolution_api_key       text,
  evolution_instance      text,
  whatsapp_template       text not null default 'Olá {nome}, lembrando da sua sessão amanhã {data} às {hora}. Confirma? 👍',
  timezone                text not null default 'America/Sao_Paulo',
  updated_at              timestamptz not null default now()
);

-- =============== RLS ===============
alter table public.patients_psicologa      enable row level security;
alter table public.appointments_psicologa  enable row level security;
alter table public.expenses_psicologa      enable row level security;
alter table public.settings_psicologa      enable row level security;

create policy "own rows" on public.patients_psicologa
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.appointments_psicologa
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.expenses_psicologa
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.settings_psicologa
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============== Views ===============
-- Receita/despesas consolidadas por mês
create or replace view public.v_financeiro_mensal_psicologa as
with receitas as (
  select
    user_id,
    date_trunc('month', inicio) as mes,
    tipo,
    sum(coalesce(valor_bruto,0))                                         as bruto,
    sum(coalesce(valor_bruto,0) * (1 - coalesce(percentual_clinica,0)/100)) as liquido
  from public.appointments_psicologa
  where status = 'realizado'
  group by 1,2,3
),
despesas as (
  select user_id, date_trunc('month', data) as mes, sum(valor) as total_despesas
  from public.expenses_psicologa
  group by 1,2
)
select
  coalesce(r.user_id, d.user_id) as user_id,
  coalesce(r.mes, d.mes)         as mes,
  coalesce(sum(r.bruto) filter (where r.tipo='particular'),0) as receita_particular_bruta,
  coalesce(sum(r.bruto) filter (where r.tipo='plano'),0)      as receita_plano_bruta,
  coalesce(sum(r.liquido),0)                                  as receita_liquida,
  coalesce(max(d.total_despesas),0)                           as despesas
from receitas r
full outer join despesas d on d.user_id = r.user_id and d.mes = r.mes
group by 1,2;
