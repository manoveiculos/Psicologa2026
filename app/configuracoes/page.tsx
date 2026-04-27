import { supabaseServer } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";

import { revalidatePath } from "next/cache";
import { WhatsAppConnection } from "./WhatsAppConnection";
import { ClinicSettings } from "./ClinicSettings";
import { ReminderAutomation } from "./ReminderAutomation";
import { Settings, Shield, Globe, Bell, Zap, Clock } from "lucide-react";
import { WorkingHoursManager } from "./WorkingHoursManager";
import { HorarioTrabalho } from "@/lib/slots";
import { RealTimeSyncButton } from "./RealTimeSyncButton";
import { DisconnectGoogleButton } from "./DisconnectGoogleButton";

export const dynamic = "force-dynamic";

import { saveGeneralPreferencesAction, saveWhatsAppSettingsAction } from "./actions";
import { GeneralPreferencesForm } from "./GeneralPreferencesForm";
import { WhatsAppSettingsForm } from "./WhatsAppSettingsForm";

export default async function ConfiguracoesPage() {
  const user = await getAuthenticatedUser();
  if (!user) return <p className="p-8 text-center text-slate-500">Faça login para configurar.</p>;

  const sb = await supabaseServer();


  const { data: s } = await sb.from("settings_psicologa").select("*").eq("user_id", user.id).maybeSingle();

  return (
    <div className="max-w-5xl mx-auto pb-32 space-y-6 md:space-y-10">
      <div className="px-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Configurações</h2>
        <p className="text-sm text-slate-500 mt-1">Gerencie seu perfil profissional, integrações e preferências.</p>
      </div>

      {/* Seção 1: Dados da Clínica / Profissional */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-10 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Dados da Clínica / Profissional</h3>
            <p className="text-xs text-slate-400">Estas informações aparecerão em seus recibos e documentos.</p>
          </div>
        </div>
        <ClinicSettings settings={s || {}} userId={user.id} />
      </section>

      {/* Seção 2: Integrações e Preferências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-10 shadow-sm h-full overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800">Google Calendar</h3>
          </div>
          {s?.google_refresh_token ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 font-medium">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Google Calendar Conectado
              </div>
              
              <RealTimeSyncButton 
                isActivated={!!s?.google_webhook_id} 
                expiration={s?.google_webhook_expiration} 
              />

              <DisconnectGoogleButton />
            </div>
          ) : (
            <a href="/api/auth/google/start" className="flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition-all hover:bg-brand/90 hover:shadow-md">
              Conectar Google Calendar
            </a>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-10 shadow-sm h-full overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800">Preferências Gerais</h3>
          </div>
          <GeneralPreferencesForm settings={s || {}} />
        </section>
      </div>

      {/* Seção 3: Gestão de Horários */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-10 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Gestão de Horários</h3>
            <p className="text-xs text-slate-400">Defina sua disponibilidade semanal para agendamentos públicos.</p>
          </div>
          <div className="ml-auto">
            <a 
              href={`/horarios-livres?id=${user.id}`} 
              target="_blank" 
              className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Globe className="h-3 w-3" />
              Ver Página Pública
            </a>
          </div>
        </div>
        <WorkingHoursManager initialHorario={s?.horario_trabalho as HorarioTrabalho} userId={user.id} />
      </section>

      {/* Seção 4: Automação de Lembretes */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-10 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Automação de Lembretes</h3>
            <p className="text-xs text-slate-400">Configure o envio automático de mensagens e sincronização.</p>
          </div>
        </div>
        <ReminderAutomation settings={s || {}} userId={user.id} />
      </section>

      {/* Seção 4: WhatsApp Evolution API */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 md:p-10 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Evolution API (WhatsApp)</h3>
            <p className="text-xs text-slate-400">Configure a conexão para lembretes automáticos via WhatsApp.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          <div>
            <WhatsAppConnection 
              settings={{
                evolution_url: s?.evolution_url,
                evolution_api_key: s?.evolution_api_key,
                evolution_instance: s?.evolution_instance
              }} 
              userPhone={s?.whatsapp_profissional}
            />
          </div>
          <WhatsAppSettingsForm 
            settings={{
              evolution_url: s?.evolution_url,
              evolution_api_key: s?.evolution_api_key,
              evolution_instance: s?.evolution_instance
            }} 
          />
        </div>
      </section>
    </div>
  );
}



