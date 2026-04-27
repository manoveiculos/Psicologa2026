import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { calendarClient, watchCalendar } from "@/lib/google";

export const dynamic = "force-dynamic";

/**
 * Cron de fallback / renovação:
 *  - Para cada usuário conectado, faz incremental sync via syncToken.
 *  - Renova o canal de watch caso esteja perto da expiração (< 24h).
 */

function assertCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret && header !== secret) return false;
  return true;
}

export async function GET(req: NextRequest) {
  if (!assertCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data: settings } = await sb
    .from("settings_psicologa")
    .select("user_id,google_refresh_token,google_calendar_id,google_sync_token,google_webhook_id,google_resource_id,google_webhook_expiration")
    .not("google_refresh_token", "is", null);

  const results: any[] = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://psicologa.app";
  const webhookUrl = `${appUrl}/api/webhooks/google-calendar`;

  for (const s of settings ?? []) {
    try {
      const cal = calendarClient(s.google_refresh_token!);
      const calendarId = s.google_calendar_id ?? "primary";

      // 1) Renovação de watch se faltam < 24h para expirar
      if (s.google_webhook_expiration) {
        const expiresAt = Number(s.google_webhook_expiration);
        const dayMs = 24 * 60 * 60 * 1000;
        if (Date.now() > expiresAt - dayMs) {
          try {
            const { data: watchData } = await watchCalendar(s.google_refresh_token!, calendarId, webhookUrl, s.user_id);
            await sb.from("settings_psicologa").update({
              google_webhook_id: watchData.id,
              google_resource_id: watchData.resourceId,
              google_webhook_expiration: watchData.expiration,
              updated_at: new Date().toISOString(),
            }).eq("user_id", s.user_id);
            results.push({ user: s.user_id, watch_renewed: true });
          } catch (err: any) {
            results.push({ user: s.user_id, watch_renew_error: err.message });
          }
        }
      }

      // 2) Sync incremental via syncToken (mesma lógica do webhook, mas chamada periodicamente)
      let events: any[] = [];
      let nextSyncToken: string | undefined;

      const tryList = async (params: any) => {
        const all: any[] = [];
        let pageToken: string | undefined;
        let token: string | undefined;
        do {
          const resp = await cal.events.list({ ...params, pageToken });
          all.push(...(resp.data.items ?? []));
          pageToken = resp.data.nextPageToken ?? undefined;
          if (resp.data.nextSyncToken) token = resp.data.nextSyncToken;
        } while (pageToken);
        return { items: all, syncToken: token };
      };

      try {
        if (s.google_sync_token) {
          const r = await tryList({ calendarId, syncToken: s.google_sync_token });
          events = r.items;
          nextSyncToken = r.syncToken;
        } else {
          const r = await tryList({
            calendarId,
            timeMin: new Date(Date.now() - 7 * 86400000).toISOString(),
            timeMax: new Date(Date.now() + 60 * 86400000).toISOString(),
            singleEvents: true,
            showDeleted: true,
          });
          events = r.items;
          nextSyncToken = r.syncToken;
        }
      } catch (err: any) {
        if (err?.response?.status === 410 || /410/.test(err.message ?? "")) {
          const r = await tryList({
            calendarId,
            timeMin: new Date(Date.now() - 7 * 86400000).toISOString(),
            timeMax: new Date(Date.now() + 60 * 86400000).toISOString(),
            singleEvents: true,
            showDeleted: true,
          });
          events = r.items;
          nextSyncToken = r.syncToken;
        } else {
          throw err;
        }
      }

      if (nextSyncToken) {
        await sb.from("settings_psicologa")
          .update({ google_sync_token: nextSyncToken, updated_at: new Date().toISOString() })
          .eq("user_id", s.user_id);
      }

      let upserted = 0;
      for (const e of events) {
        if (!e.id || !e.start?.dateTime || !e.end?.dateTime) continue;
        if (e.status === "cancelled") {
          await sb.from("appointments_psicologa")
            .update({ status: "cancelado", updated_at: new Date().toISOString() })
            .eq("google_event_id", e.id)
            .eq("user_id", s.user_id);
          continue;
        }
        const appId = e.extendedProperties?.private?.app_id;
        const tipo = e.extendedProperties?.private?.tipo_atendimento;
        const statusFin = e.extendedProperties?.private?.status_financeiro;
        const row: any = {
          user_id: s.user_id,
          google_event_id: e.id,
          inicio: e.start.dateTime,
          fim: e.end.dateTime,
          titulo_calendar: e.summary ?? null,
          updated_at: new Date().toISOString(),
        };
        if (appId) row.id = appId;
        if (tipo) {
          row.tipo_atendimento = tipo;
          row.tipo = tipo === "convenio" ? "plano" : tipo;
        }
        if (statusFin) row.status_financeiro = statusFin;
        await sb.from("appointments_psicologa").upsert(row, {
          onConflict: "user_id,google_event_id",
          ignoreDuplicates: false,
        });
        upserted++;
      }

      results.push({ user: s.user_id, events: upserted });
    } catch (err: any) {
      results.push({ user: s.user_id, error: err.message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
