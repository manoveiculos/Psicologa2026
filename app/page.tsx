import { supabaseServer } from "@/lib/supabase/server";
import { BRL, APP_TZ } from "@/lib/utils";
import { slotsLivresSemana, type HorarioTrabalho } from "@/lib/slots";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import Link from "next/link";
import ResumoOperacional from "@/app/components/ResumoOperacional";
import { Calendar, Users, DollarSign, ClipboardList, Clock, ArrowRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

async function loadData() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const last7Days = subDays(now, 7);

  const [settings, appts, financeiro, todasSessoesSemana] = await Promise.all([
    sb.from("settings_psicologa").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("appointments_psicologa")
      .select("id,inicio,fim,tipo,status")
      .eq("user_id", user.id)
      .gte("inicio", weekStart.toISOString())
      .lte("inicio", weekEnd.toISOString()),
    sb.from("v_financeiro_mensal_psicologa")
      .select("*")
      .eq("user_id", user.id)
      .gte("mes", monthStart.toISOString())
      .lte("mes", monthEnd.toISOString())
      .maybeSingle(),
    // Busca todas as sessões realizadas nos últimos 7 dias para o Resumo Operacional
    sb.from("appointments_psicologa")
      .select(`
        id,
        inicio,
        patient:patients_psicologa(id, nome),
        note:clinical_notes_psicologa(id)
      `)
      .eq("user_id", user.id)
      .eq("status", "realizado")
      .gte("inicio", last7Days.toISOString())
      .order("inicio", { ascending: false })
  ]);

  const ocupados = (appts.data ?? []).map((a) => ({
    inicio: new Date(a.inicio),
    fim: new Date(a.fim),
  }));

  const slotsLivres = slotsLivresSemana({
    inicioSemana: weekStart,
    horarioTrabalho: (settings.data?.horario_trabalho ?? {}) as HorarioTrabalho,
    ocupados,
    duracaoMin: settings.data?.duracao_sessao_minutos ?? 50,
    tz: settings.data?.timezone ?? APP_TZ,
  });

  const particular = (appts.data ?? []).filter((a) => a.tipo === "particular").length;
  const plano = (appts.data ?? []).filter((a) => a.tipo === "plano").length;
  
  const sessoesRecentes = todasSessoesSemana.data ?? [];
  const totalRealizadas = sessoesRecentes.length;
  
  // Filtra agendamentos que NÃO têm note
  const listaPendencias = sessoesRecentes
    .filter(a => !(a as any).note || (a as any).note.length === 0)
    .map(a => ({
      id: a.id,
      data: a.inicio,
      pacienteId: (a as any).patient?.id,
      pacienteNome: (a as any).patient?.nome,
    }));

  return {
    slotsLivres: slotsLivres.length,
    particular,
    plano,
    totalRealizadas,
    totalPendentes: listaPendencias.length,
    listaPendencias,
    receitaLiquida: Number(financeiro.data?.receita_liquida ?? 0),
    despesas: Number(financeiro.data?.despesas ?? 0),
    hasUser: true,
  };
}

export default async function Dashboard() {
  const data = await loadData();

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <h2 className="text-lg font-semibold text-slate-800">Bem-vinda ao Psicóloga.app 👋</h2>
        <p className="mt-2 text-sm text-slate-600">
          Faça login e conecte seu Google Calendar em{" "}
          <Link href="/configuracoes" className="text-brand underline">Configurações</Link>{" "}
          para começar.
        </p>
      </div>
    );
  }

  const resultado = data.receitaLiquida - data.despesas;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-6 text-2xl font-semibold text-slate-800">Dashboard</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card 
            title="Horários livres na semana" 
            value={String(data.slotsLivres)} 
            hint="slots disponíveis" 
            icon={Clock}
          />
          <Card 
            title="Sessões na semana" 
            value={`${data.particular + data.plano}`} 
            hint={`${data.particular} particular · ${data.plano} plano`} 
            icon={Calendar}
          />
          <Card 
            title="Receita líquida do mês" 
            value={BRL.format(data.receitaLiquida)} 
            hint={`Resultado: ${BRL.format(resultado)}`} 
            icon={DollarSign}
          />
          <Card 
            title="Prontuários da Semana" 
            value={String(data.totalPendentes)} 
            hint={data.totalPendentes > 0 ? "⚠️ requerem atenção" : "✅ tudo em dia"}
            className={data.totalPendentes > 0 ? "border-red-200 bg-red-50/30" : ""}
            icon={ClipboardList}
            iconColor={data.totalPendentes > 0 ? "text-red-500" : "text-brand"}
          />
        </div>
      </div>

      {/* Atalhos Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/agenda?action=new" className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 bg-white hover:border-brand hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-brand/5 text-brand flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold text-slate-700">Novo Agendamento</span>
        </Link>
        <Link href="/pacientes?action=new" className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 bg-white hover:border-brand hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Users className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold text-slate-700">Novo Paciente</span>
        </Link>
        <Link href="/financeiro" className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 bg-white hover:border-brand hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <DollarSign className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold text-slate-700">Lançar Receita</span>
        </Link>
        <Link href="/horarios" className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 bg-white hover:border-brand hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Clock className="h-6 w-6" />
          </div>
          <span className="text-sm font-bold text-slate-700">Consultar Vagos</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ResumoOperacional 
          totalRealizadas={data.totalRealizadas} 
          totalPendentes={data.totalPendentes} 
          listaPendencias={data.listaPendencias} 
        />

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-brand-soft flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-brand" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">Agenda do Dia</h3>
          <p className="text-sm text-slate-400 mt-2">Acompanhe seus horários de hoje em tempo real.</p>
          <Link href="/agenda" className="mt-4 flex items-center gap-1 text-sm font-bold text-brand hover:underline">
            Ver agenda completa <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}

function Card({ title, value, hint, icon: Icon, iconColor = "text-brand", className = "" }: { title: string; value: string; hint?: string; icon?: any; iconColor?: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-800 tracking-tight">{value}</p>
        </div>
        {Icon && (
          <div className={`rounded-lg bg-slate-50 p-2 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">{hint}</p>}
    </div>
  );
}
