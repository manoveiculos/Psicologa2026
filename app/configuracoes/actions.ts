"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const settingsSchema = z.object({
  horario_trabalho: z.any().optional(),
  reminder_24h_enabled: z.boolean().optional(),
  reminder_1h_enabled: z.boolean().optional(),
  welcome_msg_enabled: z.boolean().optional(),
  reminder_template: z.string().optional(),
  nome_clinica: z.string().optional(),
  documento_clinica: z.string().optional(),
  endereco_clinica: z.string().optional(),
  registro_profissional: z.string().optional(),
  logo_url: z.string().nullable().optional(),
  chave_pix: z.string().optional(),
});

export async function updateSettingsAction(data: z.infer<typeof settingsSchema>) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Não autorizado");

  const validatedData = settingsSchema.parse(data);
  const sb = await supabaseServer();

  const { error } = await sb.from("settings_psicologa").upsert({
    user_id: user.id,
    ...validatedData,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Erro ao salvar configurações:", error);
    throw new Error("Erro ao salvar no banco de dados");
  }

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function uploadLogoAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("não autenticado");

  const file = formData.get("file") as File;
  if (!file) throw new Error("Arquivo não encontrado");

  const sb = supabaseAdmin();
  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}/logo_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await sb.storage
    .from('clinic-assets-psicologa')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = sb.storage
    .from('clinic-assets-psicologa')
    .getPublicUrl(filePath);

  return { publicUrl };
}

export async function desconectarGoogleAction() {
  const user = await getAuthenticatedUser();
  if (!user) return;

  const sb = supabaseAdmin();
  const { data: s } = await sb.from("settings_psicologa").select("*").eq("user_id", user.id).maybeSingle();

  if (s?.google_refresh_token && s?.google_webhook_id && s?.google_resource_id) {
    try {
      const { stopWatch } = await import("@/lib/google");
      await stopWatch(s.google_refresh_token, s.google_webhook_id, s.google_resource_id);
    } catch (e) {
      console.error("Erro ao parar webhook do Google:", e);
    }
  }

  const { error } = await sb.from("settings_psicologa").update({
    google_refresh_token: null,
    google_access_token: null,
    google_webhook_id: null,
    google_resource_id: null,
    google_webhook_expiration: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  if (error) {
    console.error("Erro ao desconectar Google:", error.message);
    throw new Error("Erro ao desconectar do banco de dados");
  }
  
  revalidatePath("/configuracoes");
}

export async function saveGeneralPreferencesAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user) return;

  const sb = await supabaseServer();

  await sb.from("settings_psicologa").upsert({
    user_id: user.id,
    duracao_sessao_minutos: Number(formData.get("duracao") ?? 50),
    aliquota_imposto: Number(formData.get("aliquota") ?? 0),
    percentual_repasse_padrao: Number(formData.get("repasse_padrao") ?? 0),
    timezone: String(formData.get("tz") ?? "America/Sao_Paulo"),
    whatsapp_profissional: String(formData.get("wp_prof") ?? ""),
    updated_at: new Date().toISOString(),
  });
  
  revalidatePath("/configuracoes");
}

export async function saveWhatsAppSettingsAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user) return;

  const sb = await supabaseServer();

  await sb.from("settings_psicologa").upsert({
    user_id: user.id,
    evolution_url: String(formData.get("evo_url") ?? "") || null,
    evolution_api_key: String(formData.get("evo_key") ?? "") || null,
    evolution_instance: String(formData.get("evo_instance") ?? "") || null,
    whatsapp_template: String(formData.get("template") ?? ""),
    updated_at: new Date().toISOString(),
  });
  
  revalidatePath("/configuracoes");
}
