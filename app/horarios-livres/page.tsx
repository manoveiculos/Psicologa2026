import { supabaseServer } from "@/lib/supabase/server";
import { APP_TZ } from "@/lib/utils";
import { slotsLivresSemana, type HorarioTrabalho, type Slot } from "@/lib/slots";
import { startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { format, toZonedTime } from "date-fns-tz";
import { Calendar, Clock, ChevronLeft, ChevronRight, User } from "lucide-react";

export const dynamic = "force-dynamic";

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function HorariosPublicosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; id?: string }>;
}) {
  const sb = await supabaseServer();
  const params = await searchParams;
  
  // Se não houver ID, busca o primeiro profissional
  let userId = params.id;
  if (!userId) {
    const { data: firstProf } = await sb.from("settings_psicologa").select("user_id").limit(1).maybeSingle();
    userId = firstProf?.user_id;
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Profissional não encontrado</h1>
          <p className="text-slate-500 mt-2">O link acessado parece ser inválido ou o profissional não foi configurado.</p>
        </div>
      </div>
    );
  }

  const offset = Number(params.semana ?? 0);
  const base = addDays(new Date(), offset * 7);
  const weekStart = startOfWeek(base, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 });

  const [{ data: settings }, { data: appts }] = await Promise.all([
    sb.from("settings_psicologa").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("appointments_psicologa")
      .select("inicio,fim,status")
      .eq("user_id", userId)
      .gte("inicio", weekStart.toISOString())
      .lte("inicio", weekEnd.toISOString())
      .neq("status", "cancelado"),
  ]);

  const tz = settings?.timezone ?? APP_TZ;
  const slots = slotsLivresSemana({
    inicioSemana: weekStart,
    horarioTrabalho: (settings?.horario_trabalho ?? {}) as HorarioTrabalho,
    ocupados: (appts ?? []).map((a) => ({ inicio: new Date(a.inicio), fim: new Date(a.fim) })),
    duracaoMin: settings?.duracao_sessao_minutos ?? 50,
    tz,
  });

  const porDia = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = format(toZonedTime(s.inicio, tz), "yyyy-MM-dd", { timeZone: tz });
    const arr = porDia.get(key) ?? [];
    arr.push(s);
    porDia.set(key, arr);
  }

  const dias = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hoje = new Date();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-4 py-2 rounded-full text-xs font-bold mb-4 uppercase tracking-widest">
            <Clock className="h-3 w-3" />
            Consulta de Disponibilidade
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            Agende sua Sessão
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            {settings?.nome_clinica ? `Com ${settings.nome_clinica}` : "Selecione um horário disponível abaixo para entrar em contato."}
          </p>
        </header>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Navegação de Semanas */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-brand-soft" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Calendário Semanal</h2>
                <p className="text-xs text-white/50">
                  {format(weekStart, "dd/MM", { timeZone: tz })} a {format(weekEnd, "dd/MM", { timeZone: tz })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <a 
                href={`/horarios-livres?semana=${offset - 1}${params.id ? `&id=${params.id}` : ""}`}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </a>
              <a 
                href={`/horarios-livres?semana=${offset + 1}${params.id ? `&id=${params.id}` : ""}`}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Grade de Horários */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
              {dias.map((d) => {
                const key = format(toZonedTime(d, tz), "yyyy-MM-dd", { timeZone: tz });
                const diaSlots = porDia.get(key) ?? [];
                const isHoje = isSameDay(d, hoje);
                
                return (
                  <div key={key} className={`flex flex-col ${isHoje ? "scale-105 z-10" : ""}`}>
                    <div className={`mb-4 text-center p-3 rounded-2xl ${
                      isHoje ? "bg-brand text-white shadow-lg" : "bg-slate-50 text-slate-500"
                    }`}>
                      <span className="block text-[10px] font-black uppercase tracking-tighter opacity-80">
                        {DIAS_PT[toZonedTime(d, tz).getDay()]}
                      </span>
                      <span className="block text-lg font-bold">
                        {format(toZonedTime(d, tz), "dd/MM", { timeZone: tz })}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {diaSlots.length === 0 ? (
                        <div className="text-center py-8 text-slate-300 italic text-xs border-2 border-dashed border-slate-50 rounded-2xl">
                          Nenhum horário
                        </div>
                      ) : (
                        diaSlots.map((s, i) => (
                          <div 
                            key={i} 
                            className="group relative cursor-pointer"
                          >
                            <div className="absolute inset-0 bg-brand/5 rounded-xl scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200" />
                            <div className="relative bg-white border border-slate-100 rounded-xl px-4 py-3 text-center transition-all group-hover:border-brand/30 group-hover:translate-y-[-2px] shadow-sm group-hover:shadow-md">
                              <span className="text-sm font-bold text-slate-700 group-hover:text-brand transition-colors">
                                {format(toZonedTime(s.inicio, tz), "HH:mm", { timeZone: tz })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              * Clique no horário desejado para solicitar seu agendamento.
            </p>
          </div>
        </div>
        
        <footer className="mt-12 text-center text-slate-400 text-xs">
          © {new Date().getFullYear()} Psicóloga.app — Plataforma de Gestão Profissional
        </footer>
      </div>
    </div>
  );
}
