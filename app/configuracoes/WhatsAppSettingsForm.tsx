"use client";

import { useTransition } from "react";
import { saveWhatsAppSettingsAction } from "./actions";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface WhatsAppSettingsFormProps {
  settings: {
    evolution_url?: string | null;
    evolution_api_key?: string | null;
    evolution_instance?: string | null;
  };
}

export function WhatsAppSettingsForm({ settings: s }: WhatsAppSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await saveWhatsAppSettingsAction(formData);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Credenciais do WhatsApp salvas!");
        }
      } catch (error) {
        toast.error("Erro ao salvar credenciais.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <Field label="URL da API" name="evo_url" defaultValue={s?.evolution_url ?? ""} placeholder="https://api..." />
        <div className="grid grid-cols-2 gap-4">
          <Field label="API Key" name="evo_key" type="password" defaultValue={s?.evolution_api_key ?? ""} />
          <Field label="Nome da Instância" name="evo_instance" defaultValue={s?.evolution_instance ?? ""} />
        </div>
      </div>
      
      <button 
        disabled={isPending}
        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isPending ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Credenciais WhatsApp</>}
      </button>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block space-y-1.5">
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</span>
      <input 
        {...rest} 
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all bg-white" 
      />
    </label>
  );
}
