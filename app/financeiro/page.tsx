import { supabaseServer } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";

import { BRL } from "@/lib/utils";
import { Suspense } from "react";
import { startOfMonth, endOfMonth, format, parse, startOfWeek, endOfWeek } from "date-fns";
import { calcularResumoFinanceiro, Transacao, Despesa } from "@/lib/financeiro";
import FiltrosFinanceiro from "./FiltrosFinanceiro";
import FormLancamento from "./FormLancamento";
import TabelaTransacoes from "./TabelaTransacoes";
import BtnAcoesDespesa from "./BtnAcoesDespesa";
import { CreditCard, TrendingUp, Landmark, Receipt, PieChart, ArrowDownCircle, ArrowUpCircle, Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    view?: "dia" | "semana" | "mes";
    data?: string;
    mes?: string;
    ano?: string;
    status?: string;
  };
}

export default async function FinanceiroPage(props: { searchParams: Promise<PageProps["searchParams"]> }) {
  const searchParams = await props.searchParams;
  const user = await getAuthenticatedUser();
  if (!user) return <p className="p-8 text-center text-slate-500">Faça login para ver o financeiro.</p>;

  const sb = await supabaseServer();


  // Parsing data de filtro
  const now = new Date();
  const view = searchParams.view || "mes";
  const currentDateStr = searchParams.data || format(now, "yyyy-MM-dd");
  const mes = searchParams.mes || format(now, "MM");
  const ano = searchParams.ano || format(now, "yyyy");
  
  let rangeStart: Date;
  let rangeEnd: Date;

  if (view === "dia") {
    const date = parse(currentDateStr, "yyyy-MM-dd", new Date());
    rangeStart = new Date(date.setHours(0, 0, 0, 0));
    rangeEnd = new Date(date.setHours(23, 59, 59, 999));
  } else if (view === "semana") {
    const date = parse(currentDateStr, "yyyy-MM-dd", new Date());
    rangeStart = startOfWeek(date, { weekStartsOn: 1 });
    rangeEnd = endOfWeek(date, { weekStartsOn: 1 });
  } else {
    // Mes
    const dateRef = parse(`${ano}-${mes}-01`, "yyyy-MM-dd", new Date());
    rangeStart = startOfMonth(dateRef);
    rangeEnd = endOfMonth(dateRef);
  }

  // Construindo a query de agendamentos (receitas)
  let query = sb.from("appointments_psicologa")
    .select(`
      *,
      patient:patients_psicologa(nome),
      porcentagem_repasse,
      id_profissional
    `)
    .eq("user_id", user.id)
    .neq("status", "cancelado") // Não mostrar cancelados no financeiro por padrão
    .gte("inicio", rangeStart.toISOString())
    .lte("inicio", rangeEnd.toISOString())
    .order("inicio", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status_recebimento", searchParams.status);
  }

  const [{ data: appointments }, { data: settings }, { data: rawDespesas }, { data: patients }] = await Promise.all([
    query,
    sb.from("settings_psicologa").select("aliquota_imposto").eq("user_id", user.id).maybeSingle(),
    sb.from("expenses_psicologa")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", format(rangeStart, "yyyy-MM-dd"))
      .lte("data", format(rangeEnd, "yyyy-MM-dd"))
      .order("data", { ascending: false }),
    sb.from("patients_psicologa")
      .select("id, nome")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("nome"),
  ]);

  // Mapeamento para o tipo Transacao
  const transacoes: (Transacao & { pacienteNome?: string })[] = (appointments ?? []).map((a) => {
    const tipoAt = a.tipo_atendimento ?? (a.tipo === "plano" ? "convenio" : a.tipo);
    return {
      id: a.id,
      valor_bruto: Number(a.valor_bruto ?? 0),
      tipo_receita: (tipoAt === "particular" || tipoAt === "convenio" || tipoAt === "misto" ? tipoAt : "particular") as any,
      status_recebimento: a.status_recebimento ?? "pendente",
      status_financeiro: a.status_financeiro,
      data_prevista: a.data_prevista,
      data_realizada: a.inicio,
      porcentagem_repasse: Number(a.porcentagem_repasse ?? 0),
      id_profissional: a.id_profissional,
      pacienteNome: (a as any).patient?.nome,
    };
  });

  const despesas: Despesa[] = (rawDespesas ?? []).map((d) => ({
    id: d.id,
    valor: Number(d.valor),
    categoria: d.categoria,
    data: d.data,
  }));

  const aliquota = Number(settings?.aliquota_imposto ?? 6);
  const resumo = calcularResumoFinanceiro(transacoes, despesas, aliquota);

  const tituloFiltro = view === "dia" 
    ? format(rangeStart, "dd/MM/yyyy") 
    : view === "semana" 
      ? `Semana ${format(rangeStart, "dd/MM")} - ${format(rangeEnd, "dd/MM")}`
      : format(rangeStart, "MM/yyyy");

  return (
    <div className="pb-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">Financeiro · {tituloFiltro}</h2>
      </div>

      <Suspense fallback={<div className="h-20 w-full animate-pulse bg-slate-50 rounded-xl" />}>
        <FiltrosFinanceiro />
      </Suspense>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card 
          title="Particular" 
          value={BRL.format(resumo.faturamentoParticular)} 
          hint={`${transacoes.filter(t => t.tipo_receita === 'particular').length} sessões`}
          icon={ArrowUpCircle}
          iconColor="text-green-500"
        />
        <Card 
          title="Convênio" 
          value={BRL.format(resumo.faturamentoConvenio)} 
          hint={`${transacoes.filter(t => t.tipo_receita === 'convenio').length} sessões`}
          icon={Landmark}
          iconColor="text-blue-500"
        />
        <Card 
          title="Repasses" 
          value={BRL.format(resumo.totalRepasses)} 
          hint="Total a pagar profissionais"
          icon={Users}
          iconColor="text-orange-500"
        />
        <Card 
          title="Despesas" 
          value={BRL.format(resumo.totalDespesas)} 
          hint={`${despesas.length} lançamentos`}
          icon={ArrowDownCircle}
          iconColor="text-red-500"
        />
        <Card 
          title="Saldo Líquido" 
          value={BRL.format(resumo.receitaLiquidaReal)} 
          className="bg-brand/5 border-brand/20 shadow-sm"
          hint="Líquido após todas deduções" 
          icon={TrendingUp}
          iconColor="text-brand"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-700">Adicionar Lançamento</h3>
          </div>
          
          <FormLancamento 
            pacientes={patients ?? []} 
          />

          <TabelaTransacoes transacoes={transacoes} />

          <h3 className="mb-4 text-lg font-semibold text-slate-700">Histórico de Despesas</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor</th>
                  <th className="px-4 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(rawDespesas ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">Nenhuma despesa para este período.</td>
                  </tr>
                ) : (
                  (rawDespesas ?? []).map((d) => (
                    <tr key={d.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-600">{format(new Date(d.data), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 capitalize">{d.categoria}</span></td>
                      <td className="px-4 py-3 text-slate-500">{d.descricao}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{BRL.format(Number(d.valor))}</td>
                      <td className="px-4 py-3 text-right">
                        <BtnAcoesDespesa despesa={d} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-700 mb-6">Detalhamento</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-sm text-slate-500">Impostos ({aliquota}%)</span>
                <span className="text-sm font-medium text-red-500">-{BRL.format(resumo.impostosEstimados)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-sm text-slate-500">Repasses Profissionais</span>
                <span className="text-sm font-medium text-orange-500">-{BRL.format(resumo.totalRepasses)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-sm text-slate-500">Despesas Totais</span>
                <span className="text-sm font-medium text-red-600">-{BRL.format(resumo.totalDespesas)}</span>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <span className="text-base font-bold text-slate-800">Resultado Líquido</span>
                <span className={`text-base font-bold ${resumo.receitaLiquidaReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {BRL.format(resumo.receitaLiquidaReal)}
                </span>
              </div>
            </div>
            
            <div className="mt-8 rounded-lg bg-blue-50 p-4">
              <p className="text-xs text-blue-700 leading-relaxed">
                Este resumo considera todos os agendamentos <strong>(exceto cancelados)</strong> no período selecionado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, hint, icon: Icon, iconColor = "text-slate-400", className = "" }: { title: string; value: string; hint?: string; icon?: any; iconColor?: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
        </div>
        {Icon && (
          <div className={`rounded-lg bg-slate-50 p-2 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {hint && <p className="mt-2 text-[11px] text-slate-500 font-medium">{hint}</p>}
    </div>
  );
}
