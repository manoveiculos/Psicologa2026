# Psicóloga.app

Sistema de gestão para psicóloga autônoma — integra Google Calendar (agenda), Evolution API (lembrete WhatsApp 24h antes) e Supabase (banco + auth) em cima de Next.js 15.

## Stack

- Next.js 15 (App Router) + React 19 + Tailwind
- Supabase (Postgres + Auth) — projeto `jkblxdxnbmciicakusnl` compartilhado; **todas as tabelas levam o sufixo `_psicologa`**
- Google Calendar API (sync bidirecional)
- Evolution API (WhatsApp self-hosted)

## Setup

```bash
npm install
cp .env.example .env.local        # preencha as variáveis
npm run dev
```

Aplique a migration no Supabase (SQL editor): `supabase/migrations/0001_init_psicologa.sql`.

Gere a chave de criptografia do prontuário:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Fluxo de uso

1. Login (Supabase Auth magic link).
2. `/configuracoes` → conectar Google Calendar (OAuth) e preencher credenciais da Evolution API.
3. Cadastrar pacientes em `/pacientes` com telefone em E.164 (`+5511...`).
4. Marcar sessões no Google Calendar como de costume — a cada 15 min o cron importa.
5. Na `/agenda`, enriquecer com paciente, valor, tipo e prontuário.
6. `/financeiro` gera DRE mensal automático.

## Crons (Vercel)

- `/api/cron/sync-calendar` — `*/15 * * * *`
- `/api/cron/send-reminders` — `0 * * * *` (janela 23–25h à frente)

Proteja com header `x-cron-secret: $CRON_SECRET`.

## Tabelas (sufixadas)

`patients_psicologa`, `appointments_psicologa`, `expenses_psicologa`, `settings_psicologa`, `v_financeiro_mensal_psicologa`.

## Checklist de verificação (após `npm install`)

1. `npm run typecheck` — deve passar sem erros.
2. `npm run dev` → abrir http://localhost:3000 → middleware redireciona para `/login`.
3. Login com magic link (configure SMTP no Supabase ou use email de dev).
4. `/configuracoes` → salvar preferências → "Conectar Google Calendar".
5. Criar um evento de teste com dateTime no Google Calendar.
6. Disparar o sync manualmente: `curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/sync-calendar`.
7. `/agenda` deve mostrar o evento — clique na linha, vincule a um paciente, marque como realizado.
8. `/financeiro` mostra receita líquida atualizada.
9. Para lembretes, configure um paciente com telefone, crie um evento daqui a ~24h, dispare `/api/cron/send-reminders` e confirme que o WhatsApp chegou; rode de novo e confira que **não** reenvia.

## Próximos passos (v2)

- Editor rico de prontuário com criptografia lado cliente
- Recibo/NF automatizado
- App PWA para a psicóloga acessar no celular entre sessões
