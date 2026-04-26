import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { calendarClient } from "@/lib/google";

export async function POST(req: NextRequest) {
  const resourceState = req.headers.get("x-goog-resource-state");
  const userId = req.headers.get("x-goog-channel-token"); // Passamos o userId no token do Watch

  // Verificação básica de expiração ou confirmação de canal
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  if (!userId) {
    console.error("Webhook do Google recebido sem userId no token.");
    return NextResponse.json({ error: "No userId" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  
  // Buscar credenciais do usuário
  const { data: settings } = await sb
    .from("settings_psicologa")
    .select("google_refresh_token, google_calendar_id")
    .eq("user_id", userId)
    .single();

  if (!settings?.google_refresh_token) {
    return NextResponse.json({ error: "User not connected" }, { status: 400 });
  }

  try {
    const cal = calendarClient(settings.google_refresh_token);
    
    // Fetch recent changes. 
    // Nota: Em produção, o ideal é usar o syncToken para buscar apenas o que mudou.
    // Para simplificar e garantir robustez inicial, vamos listar os eventos dos últimos 30 dias.
    const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás
    const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 dias à frente
    
    const resp = await cal.events.list({
      calendarId: settings.google_calendar_id ?? "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      showDeleted: true, // Importante para detectar cancelamentos
    });

    const items = resp.data.items ?? [];
    
    for (const event of items) {
      if (event.status === "cancelled") {
        // Se foi cancelado/deletado no Google, cancelamos localmente
        await sb
          .from("appointments_psicologa")
          .update({ status: "cancelado", updated_at: new Date().toISOString() })
          .eq("google_event_id", event.id)
          .eq("user_id", userId)
          .neq("status", "cancelado"); // Evita triggers desnecessários
      } else if (event.start?.dateTime && event.end?.dateTime) {
        // Upsert para sincronizar criação ou edição
        // Verificamos se o evento já existe para evitar sobrescrever dados locais sensíveis
        const { data: existing } = await sb
          .from("appointments_psicologa")
          .select("id, updated_at")
          .eq("google_event_id", event.id)
          .eq("user_id", userId)
          .maybeSingle();

        // Lógica Anti-Loop: Só atualizamos se a alteração do Google for mais recente que a local (ou se for novo)
        // O Google costuma enviar ISO strings em event.updated
        const googleUpdate = event.updated ? new Date(event.updated).getTime() : Date.now();
        const localUpdate = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;

        if (!existing || googleUpdate > localUpdate) {
          await sb.from("appointments_psicologa").upsert({
            user_id: userId,
            google_event_id: event.id!,
            inicio: event.start.dateTime,
            fim: event.end.dateTime,
            titulo_calendar: event.summary ?? "Sem título",
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,google_event_id" });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Erro no processamento do Webhook do Google Calendar:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
