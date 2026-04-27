"use client";

import { useTransition } from "react";
import { saveGeneralPreferencesAction } from "./actions";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface GeneralPreferencesFormProps {
  settings: {
    duracao_sessao_minutos?: number;
    aliquota_imposto?: number;
    timezone?: string;
    whatsapp_profissional?: string;
  };
}

export function GeneralPreferencesForm({ settings: s }: GeneralPreferencesFormProps) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await saveGeneralPreferencesAction(formData);
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Preferências salvas com sucesso!");
        }
      } catch (error) {
        toast.error("Erro ao salvar preferências.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field 
          label="Duração sessão (min)" 
          name="duracao" 
          type="number" 
          defaultValue={s?.duracao_sessao_minutos ?? 50} 
        />
        <Field 
          label="Imposto (%)" 
          name="aliquota" 
          type="number" 
          step="0.01" 
          defaultValue={s?.aliquota_imposto ?? 0} 
        />
      </div>
      <Field 
        label="Timezone" 
        name="tz" 
        defaultValue={s?.timezone ?? "America/Sao_Paulo"} 
      />
      <Field 
        label="Seu WhatsApp (Notificações)" 
        name="wp_prof" 
        defaultValue={s?.whatsapp_profissional ?? ""} 
        placeholder="Ex: 5511999999999" 
      />
      <button 
        disabled={isPending}
        className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-xs hover:bg-slate-700 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isPending ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Preferências</>}
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
