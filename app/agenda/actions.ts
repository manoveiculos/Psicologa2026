"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { calendarClient } from "@/lib/google";
import { encryptText } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

async function getUserAndCalendar() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("não autenticado");
  const { data: s } = await sb
    .from("settings_psicologa")
    .select("google_refresh_token,google_calendar_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return { sb, user, settings: s };
}

export async function createAppointment(input: {
  inicio: string;
  fim: string;
  titulo: string;
  tipo: string;
  patient_id?: string | null;
  valor_bruto?: number | null;
  percentual_clinica?: number | null;
}) {
  const { sb, user, settings } = await getUserAndCalendar();

  let googleEventId: string | null = null;
  if (settings?.google_refresh_token) {
    try {
      const cal = calendarClient(settings.google_refresh_token);
      const resp = await cal.events.insert({
        calendarId: settings.google_calendar_id ?? "primary",
        requestBody: {
          summary: input.titulo,
          start: { dateTime: input.inicio },
          end: { dateTime: input.fim },
        },
      });
      googleEventId = resp.data.id ?? null;
    } catch (e: any) {
      console.error("Falha na sincronização com Google (API desativada ou erro de permissão):", e.message);
      // Fallback para criação local apenas
      googleEventId = `local_${crypto.randomUUID()}`;
    }
  }

  const { error } = await sb.from("appointments_psicologa").insert({
    user_id: user.id,
    google_event_id: googleEventId ?? `local_${crypto.randomUUID()}`,
    inicio: input.inicio,
    fim: input.fim,
    titulo_calendar: input.titulo,
    tipo: input.tipo,
    patient_id: input.patient_id || null,
    valor_bruto: input.valor_bruto ?? null,
    status_recebimento: "pendente",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function moveAppointment(id: string, inicio: string, fim: string) {
  const { sb, user, settings } = await getUserAndCalendar();

  const { data: appt } = await sb
    .from("appointments_psicologa")
    .select("google_event_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (settings?.google_refresh_token && appt?.google_event_id && !appt.google_event_id.startsWith("local_")) {
    try {
      const cal = calendarClient(settings.google_refresh_token);
      await cal.events.patch({
        calendarId: settings.google_calendar_id ?? "primary",
        eventId: appt.google_event_id,
        requestBody: {
          start: { dateTime: inicio },
          end: { dateTime: fim },
        },
      });
    } catch (e: any) {
      console.error("Falha ao mover evento no Google:", e.message);
    }
  }

  const { error } = await sb
    .from("appointments_psicologa")
    .update({ inicio, fim, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
}

export async function deleteAppointment(id: string) {
  const { sb, user, settings } = await getUserAndCalendar();

  const { data: appt } = await sb
    .from("appointments_psicologa")
    .select("google_event_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (settings?.google_refresh_token && appt?.google_event_id && !appt.google_event_id.startsWith("local_")) {
    try {
      const cal = calendarClient(settings.google_refresh_token);
      await cal.events.delete({
        calendarId: settings.google_calendar_id ?? "primary",
        eventId: appt.google_event_id,
      });
    } catch (e: any) {
      if (!String(e.message).includes("410") && !String(e.message).includes("404")) throw e;
    }
  }

  await sb.from("appointments_psicologa").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function updateAppointmentDetails(input: {
  id: string;
  patient_id?: string | null;
  tipo: string;
  valor_bruto?: number | null;
  percentual_clinica?: number | null;
  status: string;
  prontuario_status: string;
  prontuario_texto?: string;
  titulo?: string;
}) {
  const { sb, user, settings } = await getUserAndCalendar();

  const update: Record<string, unknown> = {
    patient_id: input.patient_id || null,
    tipo: input.tipo,
    valor_bruto: input.valor_bruto ?? null,
    status: input.status,
    prontuario_status: input.prontuario_status,
    updated_at: new Date().toISOString(),
  };

  // Automação de cobrança: Se cancelar o agendamento, "cancela" a cobrança (se não estiver paga)
  if (input.status === "cancelado") {
    // Buscamos o status atual para não sobrescrever se já estiver pago
    const { data: appt } = await sb.from("appointments_psicologa").select("status_recebimento").eq("id", input.id).single();
    if (appt?.status_recebimento !== "pago") {
      update.status_recebimento = "cancelado";
    }
  }

  if (input.titulo !== undefined) update.titulo_calendar = input.titulo;

  if (input.prontuario_texto && input.prontuario_texto.trim()) {
    // Nova lógica: Salva na tabela clinical_notes_psicologa
    const { error: noteError } = await sb.from("clinical_notes_psicologa").upsert({
      user_id: user.id,
      appointment_id: input.id,
      patient_id: input.patient_id!,
      content: input.prontuario_texto,
      status: true,
      updated_at: new Date().toISOString()
    }, { onConflict: "appointment_id" });

    if (noteError) console.error("Erro ao salvar prontuário:", noteError.message);

    // Mantém compatibilidade legada se necessário
    update.prontuario_cipher = encryptText(input.prontuario_texto);
    update.prontuario_status = "feito";
  }

  const { data: current } = await sb
    .from("appointments_psicologa")
    .select("google_event_id")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    input.titulo &&
    settings?.google_refresh_token &&
    current?.google_event_id &&
    !current.google_event_id.startsWith("local_")
  ) {
    try {
      const cal = calendarClient(settings.google_refresh_token);
      await cal.events.patch({
        calendarId: settings.google_calendar_id ?? "primary",
        eventId: current.google_event_id,
        requestBody: { summary: input.titulo },
      });
    } catch (e: any) {
      console.error("Falha ao atualizar título no Google:", e.message);
    }
  }

  const { error } = await sb
    .from("appointments_psicologa")
    .update(update)
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath("/financeiro");
}
