import { supabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  MessageCircle, 
  Plus, 
  FileText, 
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Shield,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import PatientTabs from "./PatientTabs";

export const dynamic = "force-dynamic";

export default async function PatientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return <p>Faça login.</p>;

  // Busca dados do paciente
  const { data: patient } = await sb
    .from("patients_psicologa")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!patient) return notFound();

  // Busca agendamentos e notas vinculadas
  const { data: appointments } = await sb
    .from("appointments_psicologa")
    .select(`
      *,
      note:clinical_notes_psicologa(*)
    `)
    .eq("patient_id", id)
    .order("inicio", { ascending: false });

  // Busca documentos anexados
  const { data: documents } = await sb
    .from("patient_documents_psicologa")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  const idade = patient.data_nascimento 
    ? differenceInYears(new Date(), new Date(patient.data_nascimento)) 
    : null;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Botão Voltar */}
      <Link href="/pacientes" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Voltar para lista
      </Link>

      {/* Header do Perfil */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-brand-soft flex items-center justify-center border-4 border-white shadow-md ring-1 ring-slate-100">
              <User className="h-12 w-12 text-brand" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{patient.nome}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 font-medium">
                {idade && <span className="bg-slate-100 px-2 py-0.5 rounded-md">{idade} anos</span>}
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  {patient.tipo_default === 'particular' ? 'Particular' : patient.convenio || 'Plano/Convênio'}
                </span>
                {patient.telefone_e164 && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {patient.telefone_e164}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a 
              href={`https://wa.me/${patient.telefone_e164?.replace(/\D/g, '')}`} 
              target="_blank"
              className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700 hover:bg-green-100 transition-all border border-green-200"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <Link 
              href={`/agenda?action=new&patient_id=${id}&patient_name=${encodeURIComponent(patient.nome)}`}
              className="flex items-center gap-2 rounded-xl bg-brand/10 px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand hover:text-white transition-all"
            >
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Link>
            <Link 
              href={`/pacientes/${id}?tab=evolucao&edit=new`}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <FileText className="h-4 w-4" />
              Nova Evolução
            </Link>
          </div>
        </div>
      </div>

      {/* Abas e Conteúdo */}
      <PatientTabs 
        patient={patient} 
        appointments={appointments || []} 
        documents={documents || []}
      />
    </div>
  );
}
