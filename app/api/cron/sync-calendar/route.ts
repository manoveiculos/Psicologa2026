import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { calendarClient } from "@/lib/google";

export const dynamic = "force-dynamic";

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
    .select("user_id,google_refresh_token,google_calendar_id")
    .not("google_refresh_token", "is", null);

  const results: any[] = [];
  for (const s of settings ?? []) {
    try {
      const cal = calendarClient(s.google_refresh_token!);
      const timeMin = new Date();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const resp = await cal.events.list({
        calendarId: s.google_calendar_id ?? "primary",
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250,
      });

      const events = resp.data.items ?? [];
      const rows = events
        .filter((e) => e.start?.dateTime && e.end?.dateTime && e.status !== "cancelled")
        .map((e) => ({
          user_id: s.user_id,
          google_event_id: e.id!,
          inicio: e.start!.dateTime!,
          fim: e.end!.dateTime!,
          titulo_calendar: e.summary ?? null,
        }));

      if (rows.length) {
        await sb.from("appointments_psicologa").upsert(rows, {
          onConflict: "user_id,google_event_id",
          ignoreDuplicates: false,
        });
      }
      results.push({ user: s.user_id, events: rows.length });
    } catch (err: any) {
      results.push({ user: s.user_id, error: err.message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
