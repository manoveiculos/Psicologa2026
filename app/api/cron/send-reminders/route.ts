import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendWhatsappText, renderTemplate } from "@/lib/evolution";
import { format, toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret && header !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();

  const now = new Date();
  const inicioJanela = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const fimJanela = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: appts } = await sb
    .from("appointments_psicologa")
    .select("id,user_id,inicio,titulo_calendar,patients_psicologa(nome,telefone_e164)")
    .is("lembrete_enviado_em", null)
    .in("status", ["agendado"])
    .gte("inicio", inicioJanela.toISOString())
    .lte("inicio", fimJanela.toISOString());

  const results: any[] = [];
  for (const a of (appts ?? []) as any[]) {
    const tel = a.patients_psicologa?.telefone_e164;
    if (!tel) {
      results.push({ id: a.id, skipped: "sem telefone" });
      continue;
    }

    const { data: s } = await sb
      .from("settings_psicologa")
      .select("evolution_url,evolution_api_key,evolution_instance,whatsapp_template,timezone")
      .eq("user_id", a.user_id)
      .maybeSingle();

    if (!s?.evolution_url || !s.evolution_api_key || !s.evolution_instance) {
      results.push({ id: a.id, skipped: "evolution não configurado" });
      continue;
    }

    const tz = s.timezone || "America/Sao_Paulo";
    const zoned = toZonedTime(new Date(a.inicio), tz);
    const text = renderTemplate(s.whatsapp_template, {
      nome: a.patients_psicologa?.nome ?? "",
      data: format(zoned, "dd/MM", { timeZone: tz }),
      hora: format(zoned, "HH:mm", { timeZone: tz }),
    });

    try {
      await sendWhatsappText({
        url: s.evolution_url,
        apiKey: s.evolution_api_key,
        instance: s.evolution_instance,
        number: tel.replace(/\D/g, ""),
        text,
      });
      await sb
        .from("appointments_psicologa")
        .update({ lembrete_enviado_em: new Date().toISOString() })
        .eq("id", a.id);
      results.push({ id: a.id, sent: true });
    } catch (err: any) {
      results.push({ id: a.id, error: err.message });
    }
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}
