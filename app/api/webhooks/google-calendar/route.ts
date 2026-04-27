import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { calendarClient } from "@/lib/google";

export const dynamic = "force-dynamic";

/**
 * Webhook do Google Calendar.
 * Estratégia:
 *  - Usa nextSyncToken persistido em settings_psicologa.google_sync_token.
 *  - Se for primeira sincronização ou token expirado (410 Gone), faz full sync
 *    em uma janela de 7 dias atrás → 60 dias à frente e captura o novo token.
 *  - Anti-loop: ignora eventos cujo extendedProperties.private.app_updated_at
 *    é mais recente ou igual a appointments_psicologa.updated_at local
 *    (alteração originada no próprio app).
 */

async function fullSync(cal: any, calendarId: string) {
  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const events: any[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const resp = await cal.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      showDeleted: true,
      pageToken,
    });
    events.push(...(resp.data.items ?? []));
    pageToken = resp.data.nextPageToken ?? undefined;
    if (resp.data.nextSyncToken) nextSyncToken = resp.data.nextSyncToken;
  } while (pageToken);
  return { events, nextSyncToken };
}

async function incrementalSync(cal: any, calendarId: string, syncToken: string) {
  const events: any[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const resp = await cal.events.list({
      calendarId,
      syncToken: pageToken ? undefined : syncToken,
      pageToken,
    });
    events.push(...(resp.data.items ?? []));
    pageToken = resp.data.nextPageToken ?? undefined;
    if (resp.data.nextSyncToken) nextSyncToken = resp.data.nextSyncToken;
  } while (pageToken);
  return { events, nextSyncToken };
}

export async function POST(req: NextRequest) {
  const resourceState = req.headers.get("x-goog-resource-state");
  const userId = req.headers.get("x-goog-channel-token");

  if (resourceState === "sync") return NextResponse.json({ ok: true });
  if (!userId) return NextResponse.json({ error: "No userId" }, { status: 400 });

  const sb = supabaseAdmin();

  const { data: settings } = await sb
    .from("settings_psicologa")
    .select("google_refresh_token, google_calendar_id, google_sync_token")
    .eq("user_id", userId)
    .single();

  if (!settings?.google_refresh_token) {
    return NextResponse.json({ error: "User not connected" }, { status: 400 });
  }

  const cal = calendarClient(settings.google_refresh_token);
  const calendarId = settings.google_calendar_id ?? "primary";

  let events: any[] = [];
  let nextSyncToken: string | undefined;

  try {
    if (settings.google_sync_token) {
      const r = await incrementalSync(cal, calendarId, settings.google_sync_token);
      events = r.events;
      nextSyncToken = r.nextSyncToken;
    } else {
      const r = await fullSync(cal, calendarId);
      events = r.events;
      nextSyncToken = r.nextSyncToken;
    }
  } catch (err: any) {
    if (err?.response?.status === 410 || /410/.test(err.message ?? "")) {
      // Token expirado → refaz full sync
      const r = await fullSync(cal, calendarId);
      events = r.events;
      nextSyncToken = r.nextSyncToken;
    } else {
      console.error("Erro listando eventos:", err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Persiste novo syncToken
  if (nextSyncToken) {
    await sb
      .from("settings_psicologa")
      .update({ google_sync_token: nextSyncToken, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  let processed = 0;
  let skipped = 0;

  for (const event of events) {
    const eventId = event.id;
    if (!eventId) continue;

    if (event.status === "cancelled") {
      await sb
        .from("appointments_psicologa")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("google_event_id", eventId)
        .eq("user_id", userId)
        .neq("status", "cancelado");
      processed++;
      continue;
    }

    if (!event.start?.dateTime || !event.end?.dateTime) continue;

    // Localiza local pelo google_event_id ou pelo app_id no extendedProperties
    const appIdFromEvent = event.extendedProperties?.private?.app_id;
    const tipoFromEvent = event.extendedProperties?.private?.tipo_atendimento;
    const statusFromEvent = event.extendedProperties?.private?.status_financeiro;

    const { data: existing } = await sb
      .from("appointments_psicologa")
      .select("id, updated_at")
      .or(`google_event_id.eq.${eventId}${appIdFromEvent ? `,id.eq.${appIdFromEvent}` : ""}`)
      .eq("user_id", userId)
      .maybeSingle();

    // Anti-loop: se a alteração veio do próprio app, app_updated_at >= local.updated_at
    const appUpdatedAt = event.extendedProperties?.private?.app_updated_at;
    if (existing && appUpdatedAt) {
      const appTs = new Date(appUpdatedAt).getTime();
      const localTs = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      // Se o evento carrega um carimbo do app igual ou posterior ao local, é eco da nossa própria alteração
      if (appTs >= localTs - 2000) {
        skipped++;
        continue;
      }
    }

    const upsertRow: any = {
      user_id: userId,
      google_event_id: eventId,
      inicio: event.start.dateTime,
      fim: event.end.dateTime,
      titulo_calendar: event.summary ?? "Sem título",
      updated_at: new Date().toISOString(),
    };
    if (existing?.id) upsertRow.id = existing.id;
    else if (appIdFromEvent) upsertRow.id = appIdFromEvent;
    if (tipoFromEvent) {
      upsertRow.tipo_atendimento = tipoFromEvent;
      upsertRow.tipo = tipoFromEvent === "convenio" ? "plano" : tipoFromEvent;
    }
    if (statusFromEvent) upsertRow.status_financeiro = statusFromEvent;

    await sb
      .from("appointments_psicologa")
      .upsert(upsertRow, { onConflict: "user_id,google_event_id" });
    processed++;
  }

  return NextResponse.json({ ok: true, processed, skipped, total: events.length });
}
