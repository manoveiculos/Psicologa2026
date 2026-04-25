"use client";

import { useState, useTransition } from "react";
import { ClipboardCheck, ClipboardX, X, Save, CheckCircle2, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { updateAppointmentDetails } from "@/app/agenda/actions";

interface Pendencia {
  id: string;
  data: string;
  pacienteId: string;
  pacienteNome: string;
}

export default function ResumoOperacional({
  totalRealizadas,
  totalPendentes,
  listaPendencias,
}: {
  totalRealizadas: number;
  totalPendentes: number;
  listaPendencias: Pendencia[];
}) {
  const [selected, setSelected] = useState<Pendencia | null>(null);
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSalvar() {
    if (!selected || !texto.trim()) return;

    startTransition(async () => {
      try {
        await updateAppointmentDetails({
          id: selected.id,
          patient_id: selected.pacienteId,
          tipo: "particular",
          status: "realizado",
          prontuario_status: "feito",
          prontuario_texto: texto,
        });
        setSelected(null);
        setTexto("");
      } catch (error) {
        alert("Erro ao salvar prontuário.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-brand-soft p-2 text-brand">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-700 leading-none">Resumo Operacional</h3>
            <p className="text-xs text-slate-500 mt-1">
              {totalRealizadas} sessões realizadas | {totalPendentes} pendentes
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${totalPendentes > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
          {totalPendentes === 0 ? "Tudo em dia" : `${totalPendentes} pendentes`}
        </span>
      </div>

      {listaPendencias.length === 0 ? (
        <div className="py-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="rounded-full bg-green-50 p-4 text-green-500">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">Nenhum prontuário pendente</p>
          <p className="text-xs text-slate-400 mt-1">Excelente trabalho na organização!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listaPendencias.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                  {p.pacienteNome[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-none">{p.pacienteNome}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{format(new Date(p.data), "dd MMM 'às' HH:mm")}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(p)}
                className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-white transition-all flex items-center gap-1.5"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Documentar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Preenchimento */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-brand-soft p-2 text-brand">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">Evolução Clínica</h4>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="font-bold text-slate-800 text-base">{selected.pacienteNome}</p>
              <p className="text-xs text-slate-500 mt-0.5">{format(new Date(selected.data), "dd/MM/yyyy 'às' HH:mm")}</p>
            </div>

            <textarea
              autoFocus
              className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand focus:outline-none transition-all resize-none bg-slate-50/50"
              rows={10}
              placeholder="Descreva a evolução da sessão aqui..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={handleSalvar}
                disabled={isPending || !texto.trim()}
                className="rounded-lg bg-brand px-6 py-2 text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand/90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isPending ? "Salvando..." : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Prontuário
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
