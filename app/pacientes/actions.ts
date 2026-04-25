"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deletarPaciente(id: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  // As notas e agendamentos devem ser deletados ou ter restrição de FK.
  // No Supabase, se configuramos ON DELETE CASCADE, é automático.
  // Caso contrário, precisamos deletar manualmente ou avisar o usuário.
  // Vamos assumir que o usuário quer deletar tudo relacionado.
  
  await sb.from("patients_psicologa").delete().eq("id", id).eq("user_id", user.id);
  
  revalidatePath("/pacientes");
}

export async function atualizarResumoPaciente(id: string, data: any) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  await sb.from("patients_psicologa").update(data).eq("id", id).eq("user_id", user.id);
  
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
}
