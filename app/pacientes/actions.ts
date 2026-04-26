"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

const patientIdSchema = z.string().uuid();

export async function deletarPaciente(rawId: string) {
  const id = patientIdSchema.parse(rawId);
  const user = await getAuthenticatedUser();
  if (!user) return;

  const sb = await supabaseServer();

  await sb.from("patients_psicologa").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/pacientes");
}

export async function atualizarResumoPaciente(rawId: string, data: any) {
  const id = patientIdSchema.parse(rawId);
  const user = await getAuthenticatedUser();
  if (!user) return;

  const sb = await supabaseServer();

  await sb.from("patients_psicologa").update(data).eq("id", id).eq("user_id", user.id);
  
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
}
