
"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";

import { revalidatePath } from "next/cache";

export async function criarLancamento(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Não autorizado" };

  const sb = await supabaseServer();


  const flux = formData.get("fluxo"); // 'entrada' ou 'saida'
  const valor = Number(formData.get("valor"));
  const data = String(formData.get("data"));
  const descricao = String(formData.get("descricao"));
  const recorrente = formData.get("recorrente") === "on";
  const frequencia = formData.get("frequencia"); // 'mensal' ou 'anual'

  try {
    if (flux === "saida") {
      await sb.from("expenses_psicologa").insert({
        user_id: user.id,
        data,
        categoria: String(formData.get("categoria")),
        descricao,
        valor,
        recorrencia: recorrente ? (frequencia === "mensal" ? "mensal" : "anual") : "unica",
      });
    } else {
      // Entrada (Receita/Sessão)
      const pacienteId = formData.get("pacienteId");
      const tipo = formData.get("tipo"); // 'particular' ou 'convenio'

      await sb.from("appointments_psicologa").insert({
        user_id: user.id,
        patient_id: pacienteId || null,
        inicio: new Date(data).toISOString(),
        fim: new Date(data).toISOString(),
        tipo: tipo === "particular" ? "particular" : "plano",
        valor_bruto: valor,
        status: "realizado",
        status_recebimento: "pago",
        id_profissional: user.id,
      });
    }

    revalidatePath("/financeiro");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function alternarStatus(id: string, atual: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Não autorizado" };

  const sb = await supabaseServer();
  const novoStatus = atual === "pago" ? "pendente" : "pago";
  
  const { error } = await sb
    .from("appointments_psicologa")
    .update({ status_recebimento: novoStatus })
    .eq("id", id)
    .eq("user_id", user.id);


  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { success: true };
}

export async function excluirTransacao(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Não autorizado" };

  const sb = await supabaseServer();


  const { error } = await sb.from("appointments_psicologa").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  
  revalidatePath("/financeiro");
  return { success: true };
}

export async function excluirDespesa(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Não autorizado" };

  const sb = await supabaseServer();


  const { error } = await sb.from("expenses_psicologa").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  
  revalidatePath("/financeiro");
  return { success: true };
}
export async function atualizarTransacao(id: string, data: any) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Não autorizado" };

  const sb = await supabaseServer();
  const { error } = await sb
    .from("appointments_psicologa")
    .update({
      inicio: new Date(data.data).toISOString(),
      fim: new Date(data.data).toISOString(),
      valor_bruto: Number(data.valor),
      tipo: data.tipo === "convenio" ? "plano" : "particular",
    })
    .eq("id", id)
    .eq("user_id", user.id);


  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { success: true };
}

export async function atualizarDespesa(id: string, data: any) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Não autorizado" };

  const sb = await supabaseServer();
  const { error } = await sb
    .from("expenses_psicologa")
    .update({
      data: data.data,
      categoria: data.categoria,
      descricao: data.descricao,
      valor: Number(data.valor),
    })
    .eq("id", id)
    .eq("user_id", user.id);


  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { success: true };
}

export async function excluirTransacoesEmMassa(ids: string[]) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Não autorizado" };

  const sb = await supabaseServer();


  const { error } = await sb.from("appointments_psicologa").delete().in("id", ids).eq("user_id", user.id);
  if (error) return { error: error.message };
  
  revalidatePath("/financeiro");
  return { success: true };
}

export async function atualizarStatusEmMassa(ids: string[], novoStatus: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Não autorizado" };

  const sb = await supabaseServer();


  const { error } = await sb
    .from("appointments_psicologa")
    .update({ status_recebimento: novoStatus })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return { success: true };
}

