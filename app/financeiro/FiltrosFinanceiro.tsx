
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FiltrosFinanceiro() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentView = searchParams.get("view") || "mes";
  const currentDate = searchParams.get("data") || format(new Date(), "yyyy-MM-dd");
  const currentMonth = searchParams.get("mes") || format(new Date(), "MM");
  const currentYear = searchParams.get("ano") || format(new Date(), "yyyy");
  const currentStatus = searchParams.get("status") || "";

  function updateFilter(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([name, value]) => {
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
    });
    router.push(`?${params.toString()}`);
  }

  const months = [
    { v: "01", l: "Janeiro" },
    { v: "02", l: "Fevereiro" },
    { v: "03", l: "Março" },
    { v: "04", l: "Abril" },
    { v: "05", l: "Maio" },
    { v: "06", l: "Junho" },
    { v: "07", l: "Julho" },
    { v: "08", l: "Agosto" },
    { v: "09", l: "Setembro" },
    { v: "10", l: "Outubro" },
    { v: "11", l: "Novembro" },
    { v: "12", l: "Dezembro" },
  ];

  const years = ["2024", "2025", "2026"];

  return (
    <div className="mb-8 flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visualização</label>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {["dia", "semana", "mes"].map((v) => (
            <button
              key={v}
              onClick={() => updateFilter({ view: v })}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                currentView === v 
                  ? "bg-white text-brand shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v === "mes" ? "Mês" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-10 w-px bg-slate-100 hidden md:block" />

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {currentView === "dia" ? "Data" : currentView === "semana" ? "Semana de" : "Período"}
        </label>
        <div className="flex items-center gap-2">
          {currentView === "dia" || currentView === "semana" ? (
            <input
              type="date"
              value={currentDate}
              onChange={(e) => updateFilter({ data: e.target.value })}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          ) : (
            <>
              <select
                value={currentMonth}
                onChange={(e) => updateFilter({ mes: e.target.value })}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {months.map((m) => (
                  <option key={m.v} value={m.v}>{m.l}</option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => updateFilter({ ano: e.target.value })}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className="h-10 w-px bg-slate-100 hidden md:block" />

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
        <select
          value={currentStatus}
          onChange={(e) => updateFilter({ status: e.target.value })}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <option value="">Todos</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
          <option value="glosado">Glosado</option>
        </select>
      </div>

      {currentView === "semana" && (
        <div className="ml-auto text-[10px] font-medium text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
          Exibindo de {format(startOfWeek(new Date(currentDate), { weekStartsOn: 1 }), "dd/MM")} até {format(endOfWeek(new Date(currentDate), { weekStartsOn: 1 }), "dd/MM")}
        </div>
      )}
    </div>
  );
}

