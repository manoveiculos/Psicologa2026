"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Clock, Calendar, Save } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import { HorarioTrabalho } from "@/lib/slots";

const DIAS_SEMANA = [
  { id: "0", label: "Domingo" },
  { id: "1", label: "Segunda-feira" },
  { id: "2", label: "Terça-feira" },
  { id: "3", label: "Quarta-feira" },
  { id: "4", label: "Quinta-feira" },
  { id: "5", label: "Sexta-feira" },
  { id: "6", label: "Sábado" },
];

interface WorkingHoursManagerProps {
  initialHorario?: HorarioTrabalho | null;
}

export function WorkingHoursManager({ initialHorario }: WorkingHoursManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [horario, setHorario] = useState<HorarioTrabalho>(initialHorario || {
    "1": [["09:00", "18:00"]],
    "2": [["09:00", "18:00"]],
    "3": [["09:00", "18:00"]],
    "4": [["09:00", "18:00"]],
    "5": [["09:00", "18:00"]],
  });

  const addInterval = (diaId: string) => {
    const novosIntervalos = [...(horario[diaId] || []), ["09:00", "18:00"] as [string, string]];
    setHorario({ ...horario, [diaId]: novosIntervalos });
  };

  const removeInterval = (diaId: string, index: number) => {
    const novosIntervalos = (horario[diaId] || []).filter((_, i) => i !== index);
    const novoHorario = { ...horario };
    if (novosIntervalos.length === 0) {
      delete novoHorario[diaId];
    } else {
      novoHorario[diaId] = novosIntervalos;
    }
    setHorario(novoHorario);
  };

  const updateTime = (diaId: string, intervalIndex: number, timeIndex: 0 | 1, value: string) => {
    const novosIntervalos = [...(horario[diaId] || [])];
    const novoIntervalo = [...novosIntervalos[intervalIndex]] as [string, string];
    novoIntervalo[timeIndex] = value;
    novosIntervalos[intervalIndex] = novoIntervalo;
    setHorario({ ...horario, [diaId]: novosIntervalos });
  };

  async function handleSalvar() {
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    startTransition(async () => {
      try {
        const { error } = await sb.from("settings_psicologa").upsert({
          user_id: user.id,
          horario_trabalho: horario,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success("Grade de horários salva com sucesso!");
      } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar grade de horários.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {DIAS_SEMANA.map((dia) => {
          const intervalos = horario[dia.id] || [];
          const isAtivo = intervalos.length > 0;

          return (
            <div 
              key={dia.id} 
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all ${
                isAtivo ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 mb-4 md:mb-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isAtivo ? "bg-brand/10 text-brand" : "bg-slate-200 text-slate-400"
                }`}>
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${isAtivo ? "text-slate-800" : "text-slate-500"}`}>
                    {dia.label}
                  </h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                    {isAtivo ? `${intervalos.length} período(s)` : "Indisponível"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {intervalos.map((intervalo, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input 
                        type="time" 
                        value={intervalo[0]} 
                        onChange={(e) => updateTime(dia.id, idx, 0, e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 outline-none"
                      />
                    </div>
                    <span className="text-slate-300">às</span>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input 
                        type="time" 
                        value={intervalo[1]} 
                        onChange={(e) => updateTime(dia.id, idx, 1, e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => removeInterval(dia.id, idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={() => addInterval(dia.id)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-brand hover:underline mt-1 w-fit"
                >
                  <Plus className="h-3 w-3" />
                  {intervalos.length === 0 ? "Ativar dia" : "Adicionar período"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-50">
        <button 
          onClick={handleSalvar}
          disabled={isPending}
          className="bg-brand text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-brand/90 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
        >
          {isPending ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Grade de Horários</>}
        </button>
      </div>
    </div>
  );
}
