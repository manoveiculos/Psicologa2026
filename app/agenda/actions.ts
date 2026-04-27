"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";

import { calendarClient, watchCalendar, buildExtendedProperties } from "@/lib/google";
import { encryptText } from "@/lib/crypto";
import { revalidatePath } from "next/cache";

import { z } from "zod";
import { addWeeks } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

const TZ = "America/Sao_Paulo";

/**
 * Aceita tanto ISO com offset ("2026-04-27T13:00:00-03:00" / "...Z") quanto
 * ISO local sem offset ("2026-04-27T13:00:00") — neste último caso interpreta
 * como horário em America/Sao_Paulo. Retorna ISO UTC (com Z).
 */
function toUtcIso(input: string): string {
  if (!input) throw new Error("data inválida");
  const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(input);
  const d = hasOffset ? new Date(input) : fromZonedTime(input, TZ);
  if (isNaN(d.getTime())) throw new Error(`data inválida: ${input}`);
  return d.toISOString();
}

// Compat com código antigo (UI ainda envia inicio/fim crus)
const appointmentSchema = z.object({
  inicio: z.string(),
  fim: z.string(),
  titulo: z.string().min(1, "Título é obrigatório"),
  // Aceita o legado e os novos
  tipo: z.enum(["particular", "plano", "convenio", "misto", "bloqueio", "pessoal"]),
  patient_id: z.string().uuid().nullable().optional(),
  valor_bruto: z.number().nullable().optional(),
  percentual_clinica: z.number().nullable().optional(),
  // Novos opcionais
  tipo_atendimento: z.enum(["particular", "convenio", "misto", "bloqueio", "pessoal"]).optional(),
  duracao_sessao_min: z.union([z.literal(30), z.literal(50), z.literal(60)]).optional(),
  alerta_clinico: z.string().optional().nullable(),
  recorrencia: z.enum(["nenhuma", "semanal", "quinzenal"]).optional().default("nenhuma"),
  recorrencia_ate: z.string().optional(),
});

async function getUserAndCalendar() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("não autenticado");

  const sb = await supabaseServer();

  const { data: s } = await sb
    .from("settings_psicologa")
    .select("google_refresh_token,google_calendar_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return { sb, user, settings: s };
}

export async function createAppointment(rawInput: z.infer<typeof appointmentSchema>) {
  const input = appointmentSchema.parse(rawInput);
  const { sb, user } = await getUserAndCalendar();
  const { data: settingsData } = await sb
    .from("settings_psicologa")
    .select("google_refresh_token, google_calendar_id, percentual_repasse_padrao")
    .eq("user_id", user.id)
    .maybeSingle();

  // Normaliza tipo legado e deriva tipo_atendimento
  const tipo_atendimento =
    input.tipo_atendimento ??
    (input.tipo === "plano" ? "convenio" : (input.tipo as any));

  // Calcula duração em minutos a partir do intervalo se não vier explícita
  const inicioUtcIso = toUtcIso(input.inicio);
  const fimUtcIso = toUtcIso(input.fim);
  const dInicio = new Date(inicioUtcIso);
  const dFim = new Date(fimUtcIso);
  const minutosIntervalo = Math.round((dFim.getTime() - dInicio.getTime()) / 60000);
  const duracao_sessao_min =
    input.duracao_sessao_min ??
    (minutosIntervalo === 30 || minutosIntervalo === 50 || minutosIntervalo === 60
      ? (minutosIntervalo as 30 | 50 | 60)
      : tipo_atendimento === "particular"
      ? 50
      : 50);

  // Validação condicional
  if (tipo_atendimento === "convenio" && ![30, 60].includes(duracao_sessao_min)) {
    throw new Error("Convênio: a duração deve ser 30 ou 60 min.");
  }
  if (tipo_atendimento === "particular" && duracao_sessao_min !== 50) {
    throw new Error("Particular: a duração deve ser 50 min.");
  }

  // Multi-sessão: convênio 60min = 2 sessões
  const qtd_sessoes =
    tipo_atendimento === "convenio" && duracao_sessao_min === 60 ? 2 : 1;
  // valor_bruto recebido é unitário; total = unitário × qtd
  const valorUnitario = input.valor_bruto ?? null;
  const valor_bruto_total = valorUnitario != null ? valorUnitario * qtd_sessoes : null;

  // Status financeiro inicial
  const status_financeiro =
    tipo_atendimento === "convenio" || tipo_atendimento === "misto"
      ? "aguardando_convenio"
      : "pendente";

  // Recorrência: gera lista de ocorrências em UTC
  const stepWeeks =
    input.recorrencia === "semanal" ? 1 : input.recorrencia === "quinzenal" ? 2 : 0;
  const ate = input.recorrencia_ate
    ? new Date(toUtcIso(input.recorrencia_ate.length <= 10 ? `${input.recorrencia_ate}T23:59:00` : input.recorrencia_ate))
    : new Date(dInicio.getFullYear(), 11, 31, 23, 59);

  const ocorrencias: { inicio: Date; fim: Date }[] = [];
  let cursor = dInicio;
  let cursorFim = dFim;
  while (cursor <= ate) {
    ocorrencias.push({ inicio: cursor, fim: cursorFim });
    if (stepWeeks === 0) break;
    cursor = addWeeks(cursor, stepWeeks);
    cursorFim = addWeeks(cursorFim, stepWeeks);
  }

  const recorrencia_id = stepWeeks > 0 ? crypto.randomUUID() : null;

  // Cria evento(s) no Google em paralelo
  const cal = settingsData?.google_refresh_token
    ? calendarClient(settingsData.google_refresh_token)
    : null;

  const rows = await Promise.all(
    ocorrencias.map(async (o) => {
      const appId = crypto.randomUUID();
      let googleEventId = `local_${appId}`;
      if (cal) {
        try {
          const resp = await cal.events.insert({
            calendarId: settingsData!.google_calendar_id ?? "primary",
            requestBody: {
              summary: input.titulo,
              start: { dateTime: o.inicio.toISOString(), timeZone: TZ },
              end: { dateTime: o.fim.toISOString(), timeZone: TZ },
              extendedProperties: buildExtendedProperties({
                appId,
                tipo_atendimento,
                status_financeiro,
                duracao_sessao_min,
              }),
            },
          });
          if (resp.data.id) googleEventId = resp.data.id;
        } catch (e: any) {
          console.error("Falha sync Google:", e.message);
        }
      }
      return {
        id: appId,
        user_id: user.id,
        google_event_id: googleEventId,
        inicio: o.inicio.toISOString(),
        fim: o.fim.toISOString(),
        titulo_calendar: input.titulo,
        tipo: tipo_atendimento === "convenio" ? "plano" : tipo_atendimento, // legado
        tipo_atendimento,
        duracao_sessao_min,
        qtd_sessoes,
        patient_id: input.patient_id || null,
        valor_bruto: valor_bruto_total,
        porcentagem_repasse: Number(settingsData?.percentual_repasse_padrao ?? 0),
        status_recebimento: "pendente",
        status_financeiro,
        alerta_clinico: input.alerta_clinico ?? null,
        recorrencia_id,
      };
    }),
  );

  const { error } = await sb.from("appointments_psicologa").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function moveAppointment(id: string, inicioRaw: string, fimRaw: string) {
  const inicio = toUtcIso(inicioRaw);
  const fim = toUtcIso(fimRaw);
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
          start: { dateTime: inicio, timeZone: TZ },
          end: { dateTime: fim, timeZone: TZ },
          extendedProperties: { private: { app_id: id, app_updated_at: new Date().toISOString() } },
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

const updateSchema = appointmentSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(["agendado", "realizado", "faltou", "cancelado"]),
  prontuario_status: z.enum(["pendente", "feito", "nao_aplicavel"]),
  prontuario_texto: z.string().optional(),
});

export async function updateAppointmentDetails(rawInput: z.infer<typeof updateSchema>) {
  const input = updateSchema.parse(rawInput);
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

    if (noteError) {
      console.error("Erro ao salvar prontuário:", noteError.message);
      throw new Error("Não foi possível salvar a evolução clínica: " + noteError.message);
    }
  }

  const { data: current } = await sb
    .from("appointments_psicologa")
    .select("google_event_id")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    settings?.google_refresh_token &&
    current?.google_event_id &&
    !current.google_event_id.startsWith("local_")
  ) {
    try {
      const cal = calendarClient(settings.google_refresh_token);
      const requestBody: any = {
        extendedProperties: { private: { app_id: input.id, app_updated_at: new Date().toISOString() } },
      };
      if (input.titulo) requestBody.summary = input.titulo;
      await cal.events.patch({
        calendarId: settings.google_calendar_id ?? "primary",
        eventId: current.google_event_id,
        requestBody,
      });
    } catch (e: any) {
      console.error("Falha ao atualizar evento no Google:", e.message);
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

/**
 * Força um full-sync do Google Calendar para o usuário atual:
 * limpa o syncToken e baixa eventos de 7 dias atrás até 60 dias à frente,
 * fazendo upsert local. Útil ao conectar pela primeira vez.
 */
export async function forceFullSync() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("não autenticado");

  const sb = await supabaseServer();
  const { data: settings } = await sb
    .from("settings_psicologa")
    .select("google_refresh_token, google_calendar_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.google_refresh_token) throw new Error("Google Calendar não conectado");

  const cal = calendarClient(settings.google_refresh_token);
  const calendarId = settings.google_calendar_id ?? "primary";
  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const events: any[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const resp = await cal.events.list({
      calendarId, timeMin, timeMax, singleEvents: true, showDeleted: true, pageToken,
    });
    events.push(...(resp.data.items ?? []));
    pageToken = resp.data.nextPageToken ?? undefined;
    if (resp.data.nextSyncToken) nextSyncToken = resp.data.nextSyncToken;
  } while (pageToken);

  let imported = 0;
  for (const e of events) {
    if (!e.id || !e.start?.dateTime || !e.end?.dateTime) continue;
    if (e.status === "cancelled") {
      await sb.from("appointments_psicologa")
        .update({ status: "cancelado", updated_at: new Date().toISOString() })
        .eq("google_event_id", e.id)
        .eq("user_id", user.id);
      continue;
    }
    const appId = e.extendedProperties?.private?.app_id;
    const tipo = e.extendedProperties?.private?.tipo_atendimento;
    const statusFin = e.extendedProperties?.private?.status_financeiro;
    const row: any = {
      user_id: user.id,
      google_event_id: e.id,
      inicio: e.start.dateTime,
      fim: e.end.dateTime,
      titulo_calendar: e.summary ?? "Sem título",
      updated_at: new Date().toISOString(),
    };
    if (appId) row.id = appId;
    if (tipo) {
      row.tipo_atendimento = tipo;
      row.tipo = tipo === "convenio" ? "plano" : tipo;
    }
    if (statusFin) row.status_financeiro = statusFin;

    const { error } = await sb.from("appointments_psicologa").upsert(row, {
      onConflict: "user_id,google_event_id",
      ignoreDuplicates: false,
    });
    if (!error) imported++;
  }

  if (nextSyncToken) {
    await sb.from("settings_psicologa")
      .update({ google_sync_token: nextSyncToken, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  return { imported, total: events.length };
}

export async function setupGoogleWebhook() {
  const { sb, user, settings } = await getUserAndCalendar();
  if (!settings?.google_refresh_token) throw new Error("Google não conectado");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://psicologa.app";
  const webhookUrl = `${appUrl}/api/webhooks/google-calendar`;

  try {
    const { data } = await watchCalendar(
      settings.google_refresh_token,
      settings.google_calendar_id ?? "primary",
      webhookUrl,
      user.id
    );

    // Salvar metadados do canal para renovação/cancelamento posterior
    await sb.from("settings_psicologa").update({
      google_webhook_id: data.id,
      google_resource_id: data.resourceId,
      google_webhook_expiration: data.expiration,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    return { ok: true, expiration: data.expiration };
  } catch (err: any) {
    console.error("Erro ao configurar Webhook:", err.message);
    throw new Error(`Falha ao ativar sincronização em tempo real: ${err.message}`);
  }
}
