-- Refatoração: tipos de atendimento, duração de sessão, status financeiro/sessão,
-- recorrência e separação de receitas no financeiro.

-- ============== patients_psicologa: atendimento misto ==============
alter table public.patients_psicologa
  add column if not exists tipo_atendimento text
    check (tipo_atendimento in ('particular','convenio','misto')) default 'particular',
  add column if not exists convenio_nome text,
  add column if not exists valor_convenio numeric(10,2),
  add column if not exists duracao_convenio_min int
    check (duracao_convenio_min in (30,60)),
  add column if not exists valor_particular numeric(10,2),
  add column if not exists duracao_particular_min int
    check (duracao_particular_min in (50)) default 50;

update public.patients_psicologa
   set tipo_atendimento = case when tipo_default = 'plano' then 'convenio' else 'particular' end
 where tipo_atendimento is null;

-- ============== appointments_psicologa ==============
-- Remove o check antigo de tipo para aceitar 'convenio' e 'misto'
alter table public.appointments_psicologa
  drop constraint if exists appointments_psicologa_tipo_check;

alter table public.appointments_psicologa
  add constraint appointments_psicologa_tipo_check
    check (tipo in ('particular','plano','convenio','misto','bloqueio','pessoal'));

alter table public.appointments_psicologa
  add column if not exists tipo_atendimento text
    check (tipo_atendimento in ('particular','convenio','misto','bloqueio','pessoal')) default 'particular',
  add column if not exists duracao_sessao_min int
    check (duracao_sessao_min in (30,50,60)),
  add column if not exists qtd_sessoes int not null default 1
    check (qtd_sessoes between 1 and 4),
  add column if not exists status_financeiro text
    check (status_financeiro in ('pago','pendente','aguardando_convenio')) default 'pendente',
  add column if not exists status_sessao text
    check (status_sessao in ('compareceu_pago','compareceu_nao_pago','faltou','faltou_justificado','remarcado')),
  add column if not exists alerta_clinico text,
  add column if not exists recorrencia_id uuid;

-- Backfill tipo_atendimento a partir do tipo legado
update public.appointments_psicologa
   set tipo_atendimento = case
     when tipo = 'plano' then 'convenio'
     else tipo
   end
 where tipo_atendimento is null;

-- Backfill duracao a partir do intervalo
update public.appointments_psicologa
   set duracao_sessao_min = greatest(30, least(60,
     case
       when extract(epoch from (fim - inicio))/60 <= 30 then 30
       when extract(epoch from (fim - inicio))/60 <= 50 then 50
       else 60
     end))
 where duracao_sessao_min is null;

create index if not exists idx_appt_psicologa_recorrencia on public.appointments_psicologa(recorrencia_id);

-- ============== View financeira atualizada ==============
create or replace view public.v_financeiro_mensal_psicologa as
with base as (
  select
    user_id,
    date_trunc('month', inicio) as mes,
    coalesce(tipo_atendimento, tipo) as tipo_atendimento,
    coalesce(valor_bruto,0) as bruto,
    coalesce(valor_bruto,0) * (1 - coalesce(percentual_clinica,0)/100) as liquido,
    status_financeiro
  from public.appointments_psicologa
  where status_sessao in ('compareceu_pago','compareceu_nao_pago')
     or status = 'realizado'  -- compat. com registros antigos
)
select
  user_id,
  mes,
  coalesce(sum(bruto) filter (where tipo_atendimento = 'particular'),0)            as receita_particular,
  coalesce(sum(bruto) filter (where tipo_atendimento in ('convenio','misto')),0)   as receita_convenio,
  coalesce(sum(bruto),0)                                                            as receita_total,
  coalesce(sum(liquido),0)                                                          as receita_liquida,
  coalesce(sum(bruto) filter (where status_financeiro = 'pago'),0)                  as recebido,
  coalesce(sum(bruto) filter (where status_financeiro in ('pendente','aguardando_convenio')),0) as a_receber
from base
group by 1,2;
