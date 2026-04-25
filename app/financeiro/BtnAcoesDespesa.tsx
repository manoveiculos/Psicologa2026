"use client";

import { Trash2, Edit, X, Save } from "lucide-react";
import { excluirDespesa, atualizarDespesa } from "./actions";
import { useState, useTransition } from "react";
import { format } from "date-fns";

interface Despesa {
  id: string;
  data: string;
  categoria: string;
  descricao: string;
  valor: number;
}

export default function BtnAcoesDespesa({ despesa }: { despesa: Despesa }) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleExcluir() {
    if (!confirm("Deseja realmente excluir esta despesa?")) return;
    setLoading(true);
    await excluirDespesa(despesa.id);
    setLoading(false);
  }

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      data: formData.get("data"),
      categoria: formData.get("categoria"),
      descricao: formData.get("descricao"),
      valor: formData.get("valor"),
    };

    startTransition(async () => {
      const res = await atualizarDespesa(despesa.id, data);
      if (res.success) setEditing(false);
      else alert("Erro ao salvar: " + res.error);
    });
  }

  return (
    <>
      <div className="flex justify-end gap-1">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
          title="Editar despesa"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={handleExcluir}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Excluir despesa"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm text-left">
          <form onSubmit={handleSaveEdit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-800">Editar Despesa</h4>
              <button type="button" onClick={() => setEditing(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Data</label>
                  <input
                    type="date"
                    name="data"
                    required
                    defaultValue={despesa.data}
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
                    defaultValue={despesa.valor}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Categoria</label>
                <input
                  type="text"
                  name="categoria"
                  required
                  defaultValue={despesa.categoria}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Descrição</label>
                <textarea
                  name="descricao"
                  rows={3}
                  defaultValue={despesa.descricao}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand/20 outline-none resize-none"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
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
    </>
  );
}
