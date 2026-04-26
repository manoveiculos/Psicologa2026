import { supabaseServer } from "@/lib/supabase/server";
import { APP_TZ } from "@/lib/utils";
import { slotsLivresSemana, type HorarioTrabalho, type Slot } from "@/lib/slots";
import { startOfWeek, endOfWeek, addDays } from "date-fns";
import { format, toZonedTime } from "date-fns-tz";

import { getAuthenticatedUser } from "@/lib/auth-server";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) return <p className="p-8 text-center text-slate-500">Faça login para ver seus horários.</p>;

  const sb = await supabaseServer();

  const params = await searchParams;
  const offset = Number(params.semana ?? 0);
  const base = addDays(new Date(), offset * 7);
  const weekStart = startOfWeek(base, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 });

  const [{ data: settings }, { data: appts }] = await Promise.all([
    sb.from("settings_psicologa").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("appointments_psicologa")
      .select("inicio,fim,status")
      .eq("user_id", user.id)
      .gte("inicio", weekStart.toISOString())
      .lte("inicio", weekEnd.toISOString())
      .neq("status", "cancelado"),
  ]);

  const tz = settings?.timezone ?? APP_TZ;
  const slots = slotsLivresSemana({
    inicioSemana: weekStart,
    horarioTrabalho: (settings?.horario_trabalho ?? {}) as HorarioTrabalho,
    ocupados: (appts ?? []).map((a) => ({ inicio: new Date(a.inicio), fim: new Date(a.fim) })),
    duracaoMin: settings?.duracao_sessao_minutos ?? 50,
    tz,
  });

  const porDia = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = format(toZonedTime(s.inicio, tz), "yyyy-MM-dd", { timeZone: tz });
    const arr = porDia.get(key) ?? [];
    arr.push(s);
    porDia.set(key, arr);
  }

  const dias = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Horários livres</h2>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/horarios?semana=${offset - 1}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50">◀ anterior</Link>
          <span className="text-slate-600">
            {format(weekStart, "dd/MM", { timeZone: tz })} – {format(weekEnd, "dd/MM", { timeZone: tz })}
          </span>
          <Link href={`/horarios?semana=${offset + 1}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50">próxima ▶</Link>
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        Total de <b>{slots.length}</b> slots disponíveis nesta semana
        (duração padrão {settings?.duracao_sessao_minutos ?? 50} min).
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        {dias.map((d) => {
          const key = format(toZonedTime(d, tz), "yyyy-MM-dd", { timeZone: tz });
          const diaSlots = porDia.get(key) ?? [];
          return (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                {DIAS_PT[toZonedTime(d, tz).getDay()]} {format(toZonedTime(d, tz), "dd/MM", { timeZone: tz })}
              </div>
              {diaSlots.length === 0 ? (
                <div className="text-xs text-slate-400">—</div>
              ) : (
                <ul className="space-y-1">
                  {diaSlots.map((s, i) => (
                    <li key={i} className="rounded-md bg-brand-soft px-2 py-1 text-center text-xs font-medium text-brand">
                      {format(toZonedTime(s.inicio, tz), "HH:mm", { timeZone: tz })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
