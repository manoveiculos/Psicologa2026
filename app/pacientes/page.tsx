import { supabaseServer } from "@/lib/supabase/server";
import { BRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { subDays } from "date-fns";
import { UserPlus, CheckCircle2, AlertCircle, Phone, CreditCard, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import DeletePatientButton from "@/components/DeletePatientButton";

export const dynamic = "force-dynamic";

async function criarPaciente(formData: FormData) {
  "use server";
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  await sb.from("patients_psicologa").insert({
    user_id: user.id,
    nome: String(formData.get("nome") ?? ""),
    telefone_e164: String(formData.get("telefone") ?? ""),
    tipo_default: String(formData.get("tipo") ?? "particular"),
    convenio: String(formData.get("convenio") ?? "") || null,
    valor_sessao_default: Number(formData.get("valor") ?? 0) || null,
  });
  revalidatePath("/pacientes");
}

export default async function PacientesPage() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return <p>Faça login para ver pacientes.</p>;

  const last7Days = subDays(new Date(), 7);

  const [pacientesRes, pendenciasRes] = await Promise.all([
    sb.from("patients_psicologa").select("*").eq("user_id", user.id).order("nome"),
    sb.from("appointments_psicologa")
      .select("patient_id, clinical_notes_psicologa(id)")
      .eq("user_id", user.id)
      .eq("status", "realizado")
      .gte("inicio", last7Days.toISOString())
  ]);

  const pacientes = pacientesRes.data ?? [];
  const todasSessoesRecentes = pendenciasRes.data ?? [];

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-slate-800">Pacientes</h2>
      <form action={criarPaciente} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5 shadow-sm items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
          <input name="nome" required placeholder="Ex: João Silva" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Telefone</label>
          <input name="telefone" placeholder="+55 11 99999-9999" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Modalidade</label>
          <select name="tipo" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none">
            <option value="particular">Particular</option>
            <option value="plano">Plano</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Convênio / Detalhes</label>
          <input name="convenio" placeholder="Nome do plano" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor Sessão</label>
            <input name="valor" type="number" step="0.01" placeholder="0,00" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
          </div>
          <button className="rounded-lg bg-brand h-9 px-4 text-xs font-bold text-white hover:bg-brand/90 transition-colors flex items-center gap-2">
            <UserPlus className="h-3.5 w-3.5" />
            Salvar
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Status Prontuário</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Convênio</th>
              <th className="px-4 py-3">Valor padrão</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pacientes.map((p) => {
              // Verifica se teve sessão nos últimos 7 dias
              const sessoesPaciente = todasSessoesRecentes.filter(s => s.patient_id === p.id);
              const teveSessao = sessoesPaciente.length > 0;
              const todasDocumentadas = teveSessao && sessoesPaciente.every(s => (s as any).clinical_notes_psicologa?.id);

              let statusBadge = <span className="text-slate-300">—</span>;
              if (teveSessao) {
                statusBadge = todasDocumentadas ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 border border-green-100">
                    <CheckCircle2 className="h-3 w-3" />
                    CONCLUÍDO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 border border-red-100">
                    <AlertCircle className="h-3 w-3" />
                    PENDENTE
                  </span>
                );
              }

              return (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/pacientes/${p.id}`} className="hover:text-brand transition-colors">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{statusBadge}</td>
                  <td className="px-4 py-3 text-slate-600">{p.telefone_e164 || "—"}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{p.tipo_default}</td>
                  <td className="px-4 py-3 text-slate-600">{p.convenio ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.valor_sessao_default ? BRL.format(Number(p.valor_sessao_default)) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <DeletePatientButton id={p.id} nome={p.nome} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
