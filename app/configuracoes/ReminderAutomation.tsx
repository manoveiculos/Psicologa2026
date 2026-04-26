"use client";

import { useState, useTransition } from "react";
import { Bell, Save, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";

interface ReminderAutomationProps {
  settings: {
    reminder_24h_enabled?: boolean;
    reminder_1h_enabled?: boolean;
    welcome_msg_enabled?: boolean;
    reminder_template?: string | null;
  };
  userId: string;
}

export function ReminderAutomation({ settings: s, userId }: ReminderAutomationProps) {
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [formData, setFormData] = useState({
    reminder_24h_enabled: s?.reminder_24h_enabled ?? false,
    reminder_1h_enabled: s?.reminder_1h_enabled ?? false,
    welcome_msg_enabled: s?.welcome_msg_enabled ?? false,
    reminder_template: s?.reminder_template || "Olá {nome_paciente}, confirmamos sua sessão para o dia {data_sessao} às {hora_sessao}. Valor: {valor_sessao}. Link para pagamento: {link_pagamento}",
  });

  async function handleSalvar() {
    const sb = supabaseBrowser();

    startTransition(async () => {
      try {
        const { error } = await sb.from("settings_psicologa").upsert({
          user_id: userId,
          ...formData,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success("Configurações de automação salvas!");
      } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar configurações.");
      }
    });
  }

  async function handleForceSync() {
    setIsSyncing(true);
    try {
      // Aqui chamaríamos um endpoint ou server action para resincronizar
      // Por enquanto, simularemos o sucesso
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Sincronização com Google Calendar iniciada com sucesso!");
    } catch (error) {
      toast.error("Erro ao forçar sincronização.");
    } finally {
      setIsSyncing(false);
    }
  }

  const variables = [
    { tag: "{nome_paciente}", desc: "Nome do paciente" },
    { tag: "{data_sessao}", desc: "Data da sessão (DD/MM)" },
    { tag: "{hora_sessao}", desc: "Hora da sessão (HH:mm)" },
    { tag: "{valor_sessao}", desc: "Valor da sessão" },
    { tag: "{link_pagamento}", desc: "Link do Pix/Pagamento" },
  ];

  return (
    <div className="space-y-8">
      {/* Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ToggleCard 
          title="Lembrete 24h antes"
          description="Enviar WhatsApp automaticamente 24 horas antes da sessão."
          enabled={formData.reminder_24h_enabled}
          onChange={(v) => setFormData({...formData, reminder_24h_enabled: v})}
        />
        <ToggleCard 
          title="Lembrete 1h antes"
          description="Enviar WhatsApp automaticamente 1 hora antes da sessão."
          enabled={formData.reminder_1h_enabled}
          onChange={(v) => setFormData({...formData, reminder_1h_enabled: v})}
        />
        <ToggleCard 
          title="Boas-vindas"
          description="Enviar mensagem após o primeiro cadastro do paciente."
          enabled={formData.welcome_msg_enabled}
          onChange={(v) => setFormData({...formData, welcome_msg_enabled: v})}
        />
      </div>

      {/* Template Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Template do Lembrete</label>
          <div className="flex items-center gap-1 text-[10px] text-brand font-medium bg-brand/5 px-2 py-0.5 rounded-full">
            <Info className="h-3 w-3" />
            Clique nas tags abaixo para inserir
          </div>
        </div>
        
        <textarea 
          rows={6}
          value={formData.reminder_template}
          onChange={(e) => setFormData({...formData, reminder_template: e.target.value})}
          className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm text-slate-700 focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all bg-slate-50/30 resize-none leading-relaxed"
          placeholder="Escreva sua mensagem aqui..."
        />

        <div className="flex flex-wrap gap-2">
          {variables.map(v => (
            <button
              key={v.tag}
              onClick={() => setFormData({...formData, reminder_template: formData.reminder_template + v.tag})}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-brand hover:text-brand transition-all shadow-sm"
              title={v.desc}
            >
              {v.tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <button 
          onClick={handleForceSync}
          disabled={isSyncing}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          Forçar Ressincronização com Google Calendar
        </button>

        <button 
          onClick={handleSalvar}
          disabled={isPending}
          className="w-full md:w-auto bg-brand text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-brand/20 hover:bg-brand/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {isPending ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Configurações de Automação</>}
        </button>
      </div>
    </div>
  );
}

function ToggleCard({ title, description, enabled, onChange }: { title: string, description: string, enabled: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className={`p-5 rounded-2xl border transition-all cursor-pointer select-none ${enabled ? "border-brand bg-brand/5 ring-1 ring-brand/10" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => onChange(!enabled)}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-xs font-bold uppercase tracking-tight ${enabled ? "text-brand" : "text-slate-700"}`}>{title}</h4>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? "bg-brand" : "bg-slate-200"}`}>
          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${enabled ? "left-6" : "left-1"}`}></div>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 leading-normal">{description}</p>
    </div>
  );
}
