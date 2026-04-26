import { supabaseServer } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-server";

import dynamic from "next/dynamic";
const CalendarView = dynamic(() => import("@/components/CalendarView"), { 
  ssr: false,
  loading: () => <div className="h-[600px] w-full animate-pulse bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">Carregando calendário...</div>
});
import { Suspense } from "react";
import { startOfMonth, endOfMonth, subWeeks, addWeeks } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const user = await getAuthenticatedUser();
  if (!user) return <p className="p-8 text-center text-slate-500">Faça login para ver a agenda.</p>;

  const sb = await supabaseServer();


  const now = new Date();
  const from = subWeeks(startOfMonth(now), 2);
  const to = addWeeks(endOfMonth(now), 2);

  const [{ data: appts }, { data: patients }, { data: settings }] = await Promise.all([
    sb.from("appointments_psicologa")
      .select("id,inicio,fim,tipo,status,prontuario_status,valor_bruto,percentual_clinica,titulo_calendar,patient_id,patients_psicologa(nome),clinical_notes_psicologa(id,content)")
      .eq("user_id", user.id)
      .gte("inicio", from.toISOString())
      .lte("inicio", to.toISOString())
      .order("inicio"),
    sb.from("patients_psicologa")
      .select("id,nome,valor_sessao_default,tipo_default")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("nome"),
    sb.from("settings_psicologa").select("google_refresh_token").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Agenda</h2>
        <p className="text-xs text-slate-500">
          arraste eventos para mover · arraste a borda inferior para redimensionar · selecione um intervalo vazio para criar
        </p>
      </div>
      {!settings?.google_refresh_token && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Conecte seu Google Calendar em <a href="/configuracoes" className="underline">Configurações</a> para sincronizar automaticamente.
        </div>
      )}
      <Suspense fallback={<div className="h-96 w-full animate-pulse bg-slate-50 rounded-xl" />}>
        <CalendarView appts={(appts ?? []) as any} patients={(patients ?? []) as any} />
      </Suspense>
    </div>
  );
}
