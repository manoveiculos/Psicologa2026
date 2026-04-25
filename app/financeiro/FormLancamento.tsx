
"use client";

import { useState } from "react";
import { criarLancamento } from "./actions";
import { format } from "date-fns";

interface FormLancamentoProps {
  pacientes: { id: string; nome: string }[];
}

export default function FormLancamento({ pacientes }: FormLancamentoProps) {
  const [fluxo, setFluxo] = useState<"entrada" | "saida">("saida");
  const [valorExibicao, setValorExibicao] = useState("");
  const [valorNumerico, setValorNumerico] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [loading, setLoading] = useState(false);

  const isInvalid = !valorNumerico || !descricao;

  const formatarMoeda = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "");
    const valorFloat = parseFloat(apenasNumeros) / 100;
    if (isNaN(valorFloat)) return { formatado: "", bruto: 0 };
    
    return {
      formatado: new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(valorFloat),
      bruto: valorFloat
    };
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { formatado, bruto } = formatarMoeda(e.target.value);
    setValorExibicao(formatado);
    setValorNumerico(bruto);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    // Garantir que o valor numérico correto seja enviado
    formData.set("valor", valorNumerico.toString());
    
    const result = await criarLancamento(formData);
    setLoading(false);
    
    if (result.success) {
      setValorExibicao("");
      setValorNumerico(0);
      setDescricao("");
      (e.target as HTMLFormElement).reset();
      setFluxo("saida");
      setRecorrente(false);
    } else {
      alert("Erro ao salvar: " + result.error);
    }
  }

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-100">
        <button
          type="button"
          onClick={() => setFluxo("entrada")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            fluxo === "entrada" 
              ? "bg-green-50 text-green-700 border-b-2 border-green-600" 
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Entrada (Receita)
        </button>
        <button
          type="button"
          onClick={() => setFluxo("saida")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            fluxo === "saida" 
              ? "bg-red-50 text-red-700 border-b-2 border-red-600" 
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Saída (Despesa)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <input type="hidden" name="fluxo" value={fluxo} />
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Data</label>
            <input
              name="data"
              type="date"
              required
              defaultValue={format(new Date(), "yyyy-MM-dd")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Descrição</label>
            <input
              name="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={fluxo === "entrada" ? "Ex: Sessão Terapia" : "Ex: Aluguel da Sala"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Valor (R$)</label>
            <input
              type="text"
              inputMode="numeric"
              value={valorExibicao}
              onChange={handleValorChange}
              placeholder="0,00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <input type="hidden" name="valor" value={valorNumerico} />
          </div>

          {fluxo === "entrada" ? (
            <>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Paciente</label>
                <select name="pacienteId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20">
                  <option value="">Selecione...</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tipo</label>
                <select name="tipo" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20">
                  <option value="particular">Particular</option>
                  <option value="convenio">Convênio</option>
                </select>
              </div>
            </>
          ) : (
            <div className="md:col-span-4">
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Categoria</label>
              <select name="categoria" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20">
                <option value="aluguel">Aluguel</option>
                <option value="marketing">Marketing</option>
                <option value="software">Software</option>
                <option value="imposto">Impostos</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          )}

          <div className="md:col-span-4 flex items-center gap-4 py-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                name="recorrente" 
                checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand/20" 
              />
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">Lançamento Recorrente</span>
            </label>

            {recorrente && (
              <select 
                name="frequencia" 
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 animate-in fade-in slide-in-from-left-2"
              >
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isInvalid || loading}
            className={`rounded-lg px-8 py-2 text-sm font-semibold text-white shadow-md transition-all ${
              isInvalid || loading 
                ? "bg-slate-300 cursor-not-allowed" 
                : fluxo === "entrada" 
                  ? "bg-green-600 hover:bg-green-700 shadow-green-200" 
                  : "bg-brand hover:bg-brand/90 shadow-brand/20"
            }`}
          >
            {loading ? "Salvando..." : `Adicionar ${fluxo === "entrada" ? "Receita" : "Despesa"}`}
          </button>
        </div>
      </form>
    </div>
  );
}
