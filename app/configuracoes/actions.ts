"use server";

import { supabaseServer } from "@/lib/supabase/server";
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
