import { supabaseServer } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";

import { BRL } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { subDays } from "date-fns";
import { UserPlus, CheckCircle2, AlertCircle, Phone, CreditCard, ShieldCheck, Trash2, Search, CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import DeletePatientButton from "@/components/DeletePatientButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

async function criarPaciente(formData: FormData) {
  "use server";
  const user = await getAuthenticatedUser();
  if (!user) return;

  const sb = await supabaseServer();


  await sb.from("patients_psicologa").insert({
    user_id: user.id,
    nome: String(formData.get("nome") ?? ""),
    telefone_e164: String(formData.get("telefone") ?? ""),
    tipo_default: String(formData.get("tipo") ?? "particular"),
    convenio: String(formData.get("convenio") ?? "") || null,
    valor_sessao_default: Number(formData.get("valor") ?? 0) || null,
    cpf: String(formData.get("cpf") ?? "") || null,
  });
  revalidatePath("/pacientes");
}

export default async function PacientesPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string }> 
}) {
  const user = await getAuthenticatedUser();
  if (!user) return <p className="p-8 text-center text-slate-500">Faça login para ver pacientes.</p>;

  const { q } = await searchParams;
  const sb = await supabaseServer();

  const last7Days = subDays(new Date(), 7);
  const now = new Date();

  // Query base de pacientes
  let query = sb.from("patients_psicologa").select("*").eq("user_id", user.id);
  
  if (q) {
    // Busca por nome ou CPF
    query = query.or(`nome.ilike.%${q}%,cpf.ilike.%${q}%`);
  }

  const [pacientesRes, pendenciasRes, nextApptsRes] = await Promise.all([
    query.order("nome"),
    sb.from("appointments_psicologa")
      .select("patient_id, clinical_notes_psicologa(id)")
      .eq("user_id", user.id)
      .eq("status", "realizado")
      .gte("inicio", last7Days.toISOString()),
    sb.from("appointments_psicologa")
      .select("patient_id, inicio")
      .eq("user_id", user.id)
      .gte("inicio", now.toISOString())
      .neq("status", "cancelado")
      .order("inicio", { ascending: true })
  ]);

  const pacientes = pacientesRes.data ?? [];
  const todasSessoesRecentes = pendenciasRes.data ?? [];
  
  // Mapeia o próximo agendamento de cada paciente
  const nextApptsMap = new Map<string, string>();
  (nextApptsRes.data ?? []).forEach(a => {
    if (!nextApptsMap.has(a.patient_id)) {
      nextApptsMap.set(a.patient_id, a.inicio);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Pacientes</h2>
          <p className="text-sm text-slate-500">Gerencie seus clientes e acompanhe o histórico de sessões.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Barra de Busca */}
        <div className="lg:col-span-3">
          <form method="GET" className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
            <input 
              name="q" 
              defaultValue={q}
              placeholder="Buscar por nome ou CPF..." 
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all text-sm"
            />
            {q && (
              <Link href="/pacientes" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                LIMPAR
              </Link>
            )}
          </form>
        </div>
        
        {/* Adicionar Paciente Toggle ou Info */}
        <div className="flex justify-end items-center">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
            {pacientes.length} Pacientes encontrados
          </p>
        </div>
      </div>

      <form action={criarPaciente} className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-5 shadow-sm items-end">
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
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">CPF</label>
          <input name="cpf" placeholder="000.000.000-00" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
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
          <thead className="bg-slate-50/50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Telefone</th>
              <th className="px-6 py-4">Próximo Agendamento</th>
              <th className="px-6 py-4">Modalidade</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pacientes.map((p) => {
              const sessoesPaciente = todasSessoesRecentes.filter(s => s.patient_id === p.id);
              const teveSessao = sessoesPaciente.length > 0;
              const todasDocumentadas = teveSessao && sessoesPaciente.every(s => (s as any).clinical_notes_psicologa?.id);
              
              const proximoData = nextApptsMap.get(p.id);

              let statusBadge = <span className="text-slate-300">—</span>;
              if (teveSessao) {
                statusBadge = todasDocumentadas ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                    <CheckCircle2 className="h-3 w-3" />
                    EM DIA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 border border-rose-100">
                    <AlertCircle className="h-3 w-3" />
                    PENDENTE
                  </span>
                );
              }

              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <Link href={`/pacientes/${p.id}`} className="group-hover:text-brand transition-colors block">
                      <p className="font-bold text-slate-800">{p.nome}</p>
                      {p.cpf && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.cpf}</p>}
                    </Link>
                  </td>
                  <td className="px-6 py-4">{statusBadge}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{p.telefone_e164 || "—"}</td>
                  <td className="px-6 py-4">
                    {proximoData ? (
                      <div className="flex items-center gap-2 text-brand font-bold">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>{format(new Date(proximoData), "dd MMM, HH:mm", { locale: ptBR })}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-700 capitalize">{p.tipo_default}</p>
                    {p.convenio && <p className="text-[10px] text-slate-400">{p.convenio}</p>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/pacientes/${p.id}`} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                      <DeletePatientButton id={p.id} nome={p.nome} />
                    </div>
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
