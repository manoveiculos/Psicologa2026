"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Trash2, Building, Fingerprint, MapPin, Hash, CreditCard, Save } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";

interface ClinicSettingsProps {
  settings: {
    nome_clinica?: string | null;
    documento_clinica?: string | null;
    endereco_clinica?: string | null;
    registro_profissional?: string | null;
    logo_url?: string | null;
    chave_pix?: string | null;
  };
  userId: string;
}

export function ClinicSettings({ settings: s, userId }: ClinicSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(s?.logo_url);
  
  const [formData, setFormData] = useState({
    nome_clinica: s?.nome_clinica || "",
    documento_clinica: s?.documento_clinica || "",
    endereco_clinica: s?.endereco_clinica || "",
    registro_profissional: s?.registro_profissional || "",
    chave_pix: s?.chave_pix || "",
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const sb = supabaseBrowser();

    startTransition(async () => {
      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/logo_${Date.now()}.${fileExt}`;

        // Upload
        const { error: uploadError } = await sb.storage
          .from('clinic-assets-psicologa')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get URL
        const { data: { publicUrl } } = sb.storage
          .from('clinic-assets-psicologa')
          .getPublicUrl(filePath);

        setLogoUrl(publicUrl);
        toast.success("Logo enviada! Lembre-se de salvar as configurações.");
      } catch (error) {
        console.error(error);
        toast.error("Erro no upload da logo.");
      }
    });
  }

  async function handleSalvar() {
    const sb = supabaseBrowser();

    startTransition(async () => {
      try {
        const { error } = await sb.from("settings_psicologa").upsert({
          user_id: userId,
          ...formData,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success("Dados da clínica salvos com sucesso!");
      } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar dados da clínica.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Logo Upload */}
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:border-brand/30 transition-colors group">
          {logoUrl ? (
            <div className="relative group">
              <img src={logoUrl} alt="Logo da Clínica" className="h-32 w-32 object-contain rounded-lg" />
              <button 
                onClick={() => setLogoUrl(null)}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:text-brand group-hover:scale-110 transition-all">
                <Upload className="h-8 w-8" />
              </div>
              <p className="text-xs font-bold text-slate-500">Logo da Clínica</p>
              <p className="text-[10px] text-slate-400 mt-1">PNG ou JPG até 2MB</p>
            </div>
          )}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 text-xs font-bold text-brand hover:underline"
          >
            {logoUrl ? "Trocar Logo" : "Selecionar Arquivo"}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />
        </div>

        {/* Basic Info */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup 
              label="Razão Social / Nome Completo" 
              icon={Building}
              value={formData.nome_clinica} 
              onChange={(v) => setFormData({...formData, nome_clinica: v})} 
            />
            <InputGroup 
              label="CPF / CNPJ" 
              icon={Fingerprint}
              value={formData.documento_clinica} 
              onChange={(v) => setFormData({...formData, documento_clinica: v})} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup 
              label="Registro Profissional (CRP)" 
              icon={Hash}
              value={formData.registro_profissional} 
              onChange={(v) => setFormData({...formData, registro_profissional: v})} 
            />
            <InputGroup 
              label="Chave Pix para Recebimento" 
              icon={CreditCard}
              value={formData.chave_pix} 
              onChange={(v) => setFormData({...formData, chave_pix: v})} 
            />
          </div>
          <InputGroup 
            label="Endereço da Clínica" 
            icon={MapPin}
            value={formData.endereco_clinica} 
            onChange={(v) => setFormData({...formData, endereco_clinica: v})} 
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSalvar}
          disabled={isPending}
          className="bg-brand text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-brand/90 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
        >
          {isPending ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Dados da Clínica</>}
        </button>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, icon: Icon, type = "text" }: { label: string, value: string, onChange: (v: string) => void, icon: any, type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon className="h-4 w-4" />
        </div>
        <input 
          type={type} 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all bg-white" 
        />
      </div>
    </div>
  );
}
