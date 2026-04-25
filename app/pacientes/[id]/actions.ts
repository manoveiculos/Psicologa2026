"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function atualizarDadosPaciente(patientId: string, data: any) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await sb
    .from("patients_psicologa")
    .update({
      nome: data.nome,
      telefone_e164: data.telefone_e164 || null,
      tipo_default: data.tipo_default || 'particular',
      convenio: data.convenio || null,
      valor_sessao_default: data.valor_sessao_default ? Number(data.valor_sessao_default) : null,
      cpf: data.cpf || null,
      data_nascimento: data.data_nascimento || null,
      endereco: data.endereco || null,
      nome_responsavel: data.nome_responsavel || null,
      profissao: data.profissao || null,
      contato_emergencia: data.contato_emergencia || null,
      queixa_principal: data.queixa_principal || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath(`/pacientes/${patientId}`);
}

export async function uploadAnexoPaciente(patientId: string, file: File, fileName: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const storagePath = `${patientId}/${Date.now()}-${fileName}`;
  
  const { data: storageData, error: storageError } = await sb.storage
    .from("patient-attachments-psicologa")
    .upload(storagePath, file);

  if (storageError) throw storageError;

  const { error: dbError } = await sb
    .from("patient_documents_psicologa")
    .insert({
      patient_id: patientId,
      user_id: user.id,
      name: fileName,
      file_path: storagePath,
      file_type: file.type,
      file_size: file.size,
    });

  if (dbError) throw dbError;
  
  revalidatePath(`/pacientes/${patientId}`);
  return storageData;
}

export async function deletarAnexoPaciente(documentId: string, filePath: string, patientId: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // Deleta do Storage
  const { error: storageError } = await sb.storage
    .from("patient-attachments-psicologa")
    .remove([filePath]);

  if (storageError) throw storageError;

  // Deleta do DB
  const { error: dbError } = await sb
    .from("patient_documents_psicologa")
    .delete()
    .eq("id", documentId)
    .eq("user_id", user.id);

  if (dbError) throw dbError;

  revalidatePath(`/pacientes/${patientId}`);
}

export async function deletarProntuario(noteId: string, patientId: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await sb
    .from("clinical_notes_psicologa")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath(`/pacientes/${patientId}`);
}

export async function deletarAgendamento(appointmentId: string, patientId: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await sb
    .from("appointments_psicologa")
    .delete()
    .eq("id", appointmentId)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath(`/pacientes/${patientId}`);
}
