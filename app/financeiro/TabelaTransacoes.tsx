
"use client";

import { BRL } from "@/lib/utils";
import { format } from "date-fns";
import { alternarStatus, excluirTransacao, atualizarTransacao, excluirTransacoesEmMassa, atualizarStatusEmMassa } from "./actions";
import { useState, useTransition, useMemo } from "react";
import { Trash2, Edit, X, Save, CheckSquare, Square, CheckCircle } from "lucide-react";

interface TransacaoExt {
  id: string;
  pacienteNome?: string;
  data_realizada: string;
  tipo_receita: "particular" | "convenio";
  valor_bruto: number;
  status_recebimento: string;
}

interface TabelaTransacoesProps {
  transacoes: TransacaoExt[];
}

export default function TabelaTransacoes({ transacoes }: TabelaTransacoesProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TransacaoExt | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const allSelected = transacoes.length > 0 && selectedIds.length === transacoes.length;

  function toggleSelectAll() {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(transacoes.map(t => t.id));
  }

  function toggleSelectOne(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleBulkDelete() {
    if (!confirm(`Deseja realmente excluir ${selectedIds.length} transações?`)) return;
    startTransition(async () => {
      await excluirTransacoesEmMassa(selectedIds);
      setSelectedIds([]);
    });
  }

  async function handleBulkStatus(status: string) {
    startTransition(async () => {
      await atualizarStatusEmMassa(selectedIds, status);
      setSelectedIds([]);
    });
  }


  async function handleToggleStatus(id: string, current: string) {
    setLoadingId(id);
    await alternarStatus(id, current);
    setLoadingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta movimentação?")) return;
    setLoadingId(id);
    await excluirTransacao(id);
    setLoadingId(null);
  }

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      data: formData.get("data"),
      valor: formData.get("valor"),
      tipo: formData.get("tipo"),
    };

    startTransition(async () => {
      const res = await atualizarTransacao(editing.id, data);
      if (res.success) setEditing(null);
      else alert("Erro ao salvar: " + res.error);
    });
  }

  const exportToCSV = () => {
    const headers = ["Data", "Paciente", "Tipo", "Valor", "Status"];
    const rows = transacoes.map(t => [
      format(new Date(t.data_realizada), "dd/MM/yyyy"),
      t.pacienteNome || "N/A",
      t.tipo_receita,
      t.valor_bruto.toFixed(2),
      t.status_recebimento
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `transacoes_${format(new Date(), "yyyyMMdd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-700">Movimentações de Receita</h3>
        <button
          onClick={exportToCSV}
          className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:shadow-sm"
        >
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/30 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-6 py-3 font-semibold w-10">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-brand transition-colors">
                  {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </button>
              </th>
              <th className="px-6 py-3 font-semibold">Data</th>
              <th className="px-6 py-3 font-semibold">Paciente / Tipo</th>
              <th className="px-6 py-3 font-semibold">Valor</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {selectedIds.length > 0 && (
              <tr className="bg-brand/5">
                <td colSpan={6} className="px-6 py-2">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-brand">{selectedIds.length} selecionados</span>
                    <div className="h-4 w-px bg-brand/20" />
                    <button 
                      onClick={() => handleBulkStatus('pago')}
                      className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Marcar como Pago
                    </button>
                    <button 
                      onClick={() => handleBulkStatus('pendente')}
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700"
                    >
                      <Clock className="h-3.5 w-3.5" /> Marcar Pendente
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir Selecionados
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {transacoes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                  Nenhuma movimentação encontrada para os filtros aplicados.
                </td>
              </tr>
            ) : (
              transacoes.map((t) => {
                const status = t.status_recebimento.toLowerCase();
                const isSelected = selectedIds.includes(t.id);
                
                let badgeClass = "bg-slate-100 text-slate-600";
                if (status === "pago") badgeClass = "bg-green-100 text-green-700 border-green-200";
                else if (status === "pendente") badgeClass = "bg-amber-100 text-amber-700 border-amber-200";
                else if (status === "atrasado" || status === "glosado") badgeClass = "bg-red-100 text-red-700 border-red-200";

                return (
                  <tr key={t.id} className={`${isSelected ? 'bg-brand/5' : 'hover:bg-slate-50/50'} transition-colors`}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelectOne(t.id)} className="text-slate-300 hover:text-brand transition-colors">
                        {isSelected ? <CheckSquare className="h-4 w-4 text-brand" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {format(new Date(t.data_realizada), "dd/MM/yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{t.pacienteNome || "Paciente Avulso"}</p>
                      <p className="text-xs text-slate-400 capitalize">{t.tipo_receita}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {BRL.format(t.valor_bruto)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(t.id, t.status_recebimento)}
                        disabled={loadingId === t.id}
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${badgeClass} ${
                          loadingId === t.id ? "opacity-50 cursor-wait" : "cursor-pointer"
                        }`}
                      >
                        {loadingId === t.id ? "..." : t.status_recebimento}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditing(t)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-brand/30 hover:text-brand transition-all shadow-sm"
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" /> Alterar
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-600 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Edição */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveEdit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-800">Editar Movimentação</h4>
              <button type="button" onClick={() => setEditing(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Paciente</label>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600">
                  {editing.pacienteNome || "Paciente Avulso"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Data</label>
                  <input
                    type="date"
                    name="data"
                    required
                    defaultValue={format(new Date(editing.data_realizada), "yyyy-MM-dd")}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Valor</label>
                  <input
                    type="number"
                    name="valor"
                    step="0.01"
                    required
                    defaultValue={editing.valor_bruto}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tipo</label>
                <select
                  name="tipo"
                  defaultValue={editing.tipo_receita === "convenio" ? "convenio" : "particular"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                >
                  <option value="particular">Particular</option>
                  <option value="convenio">Convênio</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-brand px-6 py-2 text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand/90 disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? "Salvando..." : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


