"use client";
import { useRef, useState, useTransition, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import {
  createAppointment,
  moveAppointment,
  deleteAppointment,
  updateAppointmentDetails,
} from "@/app/agenda/actions";
import { 
  Plus, 
  Check, 
  AlertCircle, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Circle
} from "lucide-react";

type Patient = {
  id: string;
  nome: string;
  valor_sessao_default: number | null;
  tipo_default: string;
  tipo_atendimento?: string | null;
  valor_convenio?: number | null;
  duracao_convenio_min?: number | null;
  valor_particular?: number | null;
  duracao_particular_min?: number | null;
};

type Appt = {
  id: string;
  inicio: string;
  fim: string;
  tipo: string;
  tipo_atendimento?: string | null;
  duracao_sessao_min?: number | null;
  qtd_sessoes?: number | null;
  status: string;
  status_financeiro?: string | null;
  status_sessao?: string | null;
  alerta_clinico?: string | null;
  prontuario_status: string;
  valor_bruto: number | null;
  percentual_clinica: number | null;
  titulo_calendar: string | null;
  patient_id: string | null;
  patients_psicologa: { nome: string } | null;
  clinical_notes_psicologa: { id: string; content: string }[] | null;
};

const STATUS_FIN_LABEL: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  aguardando_convenio: "Aguardando convênio",
};
const TIPO_LABEL: Record<string, string> = {
  particular: "Particular",
  convenio: "Convênio",
  plano: "Convênio",
  misto: "Misto",
  bloqueio: "Bloqueio",
  pessoal: "Pessoal",
};

const COLOR_BY_TIPO: Record<string, { bg: string; border: string }> = {
  particular: { bg: "#6d5dfc", border: "#5849e0" },
  plano: { bg: "#0ea5e9", border: "#0284c7" },
  bloqueio: { bg: "#94a3b8", border: "#64748b" },
  pessoal: { bg: "#f59e0b", border: "#d97706" },
};

export default function CalendarView({
  appts,
  patients,
}: {
  appts: Appt[];
  patients: Patient[];
}) {
  const calRef = useRef<FullCalendar | null>(null);
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Appt | null>(null);
  const [newRange, setNewRange] = useState<{ start: string; end: string } | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [preSelectedPatient, setPreSelectedPatient] = useState<{ id: string, name: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      const pId = searchParams.get("patient_id");
      const pName = searchParams.get("patient_name");
      if (pId && pName) {
        setPreSelectedPatient({ id: pId, name: pName });
      }
      setQuickAddOpen(true);
    }
  }, [searchParams]);

  const events: EventInput[] = useMemo(() => appts.map((a) => {
    const color = COLOR_BY_TIPO[a.tipo] ?? COLOR_BY_TIPO.particular;
    const nome = a.patients_psicologa?.nome ?? a.titulo_calendar ?? "(sem título)";
    const hasNote = a.clinical_notes_psicologa && a.clinical_notes_psicologa.length > 0;
    const marker =
      a.status === "realizado" && !hasNote
        ? "🔴 "
        : a.status === "faltou"
          ? "❌ "
          : a.status === "realizado" && hasNote
            ? "🟢 "
            : "";
    const tipoKey = a.tipo_atendimento ?? a.tipo;
    const tipoLabel = TIPO_LABEL[tipoKey] ?? tipoKey;
    const dur = a.duracao_sessao_min ??
      Math.round((new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60000);
    const finLabel = a.status_financeiro ? STATUS_FIN_LABEL[a.status_financeiro] ?? a.status_financeiro : "";
    const titleParts = [nome, tipoLabel, `${dur}min`];
    if (finLabel) titleParts.push(finLabel);
    return {
      id: a.id,
      title: `${marker}${titleParts.join(" | ")}`,
      start: a.inicio,
      end: a.fim,
      backgroundColor: color.bg,
      borderColor: color.border,
      textColor: "#fff",
      extendedProps: { appt: a },
    };
  }), [appts]);

  function handleEventClick(arg: EventClickArg) {
    const appt = arg.event.extendedProps.appt as Appt;
    setSelected(appt);
  }

  function handleSelect(arg: DateSelectArg) {
    setNewRange({ start: arg.startStr, end: arg.endStr });
    calRef.current?.getApi().unselect();
  }

  function handleDrop(arg: EventDropArg) {
    const id = arg.event.id;
    const inicio = arg.event.startStr;
    const fim = arg.event.endStr;
    start(() =>
      moveAppointment(id, inicio, fim).catch((e) => {
        alert(`Erro ao mover: ${e.message}`);
        arg.revert();
      }),
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <style>{`
        .fc-day-today {
          background-color: rgba(109, 93, 252, 0.05) !important;
        }
        .fc-daygrid-day.fc-day-today {
          border: 2px solid #6d5dfc !important;
          background-color: rgba(109, 93, 252, 0.08) !important;
          z-index: 10;
        }
        .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          background-color: #6d5dfc;
          color: white;
          border-radius: 50%;
          min-width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 2px;
        }
        .fc-timegrid-col.fc-day-today {
          background-color: rgba(109, 93, 252, 0.03) !important;
        }
      `}</style>
      <FullCalendar
        ref={calRef}
        plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={new Date()}
        locale="pt-br"
        firstDay={1}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        nowIndicator
        scrollTime={new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        editable
        selectable
        selectMirror
        weekends
        height="auto"
        slotDuration="00:30:00"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridDay,timeGridWeek,dayGridMonth,listWeek",
        }}
        buttonText={{
          today: "hoje",
          month: "mês",
          week: "semana",
          day: "dia",
          list: "lista",
        }}
        events={events}
        eventClick={handleEventClick}
        select={handleSelect}
        eventDrop={handleDrop}
        eventResize={(arg) => {
          start(() =>
            moveAppointment(arg.event.id, arg.event.startStr, arg.event.endStr).catch((e) => {
              alert(`Erro: ${e.message}`);
              arg.revert();
            }),
          );
        }}
      />

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <Legend color={COLOR_BY_TIPO.particular.bg} label="Particular" />
        <Legend color={COLOR_BY_TIPO.plano.bg} label="Plano" />
        <Legend color={COLOR_BY_TIPO.bloqueio.bg} label="Bloqueio" />
        <Legend color={COLOR_BY_TIPO.pessoal.bg} label="Pessoal" />
        <div className="flex items-center gap-3 border-l border-slate-200 ml-2 pl-4">
          <span className="flex items-center gap-1 text-slate-500">
            <Circle className="h-3 w-3 fill-red-500 text-red-500" /> prontuário pendente
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Circle className="h-3 w-3 fill-green-500 text-green-500" /> concluído
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <X className="h-3 w-3 text-red-500" /> faltou
          </span>
        </div>
      </div>

      {selected && (
        <EditDrawer
          appt={selected}
          patients={patients}
          pending={pending}
          onClose={() => setSelected(null)}
          onSave={(data) =>
            start(() =>
              updateAppointmentDetails({ id: selected.id, ...data }).then(() => setSelected(null)),
            )
          }
          onDelete={() => {
            if (!confirm("Excluir este agendamento também do Google Calendar?")) return;
            start(() => deleteAppointment(selected.id).then(() => setSelected(null)));
          }}
        />
      )}

      {newRange && (
        <CreateDrawer
          range={newRange}
          patients={patients}
          pending={pending}
          onClose={() => setNewRange(null)}
          onCreate={(data) => {
            const startDate = new Date(newRange.start);
            const endDate = new Date(startDate.getTime() + data.duracao_sessao_min * 60000);
            start(() =>
              createAppointment({
                inicio: newRange.start,
                fim: endDate.toISOString(),
                ...data,
              } as any).then(() => setNewRange(null)),
            );
          }}
        />
      )}

      {/* Botão Flutuante (FAB) */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-8 right-8 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/40 transition-all hover:scale-110 active:scale-95 hover:bg-brand/90"
        title="Agendamento Rápido"
      >
        <Plus className="h-8 w-8" />
      </button>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 rounded-xl bg-slate-900/90 backdrop-blur-md px-4 py-3 text-sm font-medium text-white shadow-2xl flex items-center gap-2 border border-white/10">
          <div className="rounded-full bg-green-500 p-1">
            <Check className="h-3 w-3 text-white" />
          </div>
          {toast}
        </div>
      )}

      {quickAddOpen && (
        <QuickAddModal
          patients={patients}
          pending={pending}
          initialPatient={preSelectedPatient}
          onClose={() => {
            setQuickAddOpen(false);
            setPreSelectedPatient(null);
          }}
          onCreate={(data) =>
            start(() =>
              createAppointment(data).then(() => {
                setQuickAddOpen(false);
                setToast("Agendado com sucesso e sincronizado com Google! ✅");
                setTimeout(() => setToast(null), 4000);
              })
            )
          }
        />
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded" style={{ background: color }} />
      {label}
    </span>
  );
}

function Drawer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function EditDrawer({
  appt,
  patients,
  pending,
  onClose,
  onSave,
  onDelete,
}: {
  appt: Appt;
  patients: Patient[];
  pending: boolean;
  onClose: () => void;
  onSave: (data: Parameters<typeof updateAppointmentDetails>[0] extends infer T
    ? T extends { id: string }
      ? Omit<T, "id">
      : never
    : never) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<{
    patient_id: string;
    tipo: string;
    valor_bruto: number | "";
    percentual_clinica: number;
    status: string;
    prontuario_status: string;
    prontuario_texto: string;
    titulo: string;
  }>({
    patient_id: appt.patient_id ?? "",
    tipo: appt.tipo,
    valor_bruto: appt.valor_bruto ?? "",
    percentual_clinica: appt.percentual_clinica ?? 0,
    status: appt.status,
    prontuario_status: appt.prontuario_status,
    prontuario_texto: appt.clinical_notes_psicologa?.[0]?.content ?? "",
    titulo: appt.titulo_calendar ?? "",
  });

  function applyPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      patient_id: id,
      tipo: p?.tipo_default ?? f.tipo,
      valor_bruto: p?.valor_sessao_default ?? f.valor_bruto,
      titulo: p?.nome ?? f.titulo,
    }));
  }

  return (
    <Drawer onClose={onClose}>
      <h3 className="mb-1 text-lg font-semibold">Editar agendamento</h3>
      <p className="mb-4 text-xs text-slate-500">
        {new Date(appt.inicio).toLocaleString("pt-BR")} — {new Date(appt.fim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="space-y-3">
        <FormField label="Título (no Google Calendar)">
          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </FormField>

        <FormField label="Paciente">
          <select
            value={form.patient_id}
            onChange={(e) => applyPatient(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">— selecionar —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo">
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="particular">Particular</option>
              <option value="plano">Plano</option>
              <option value="bloqueio">Bloqueio</option>
              <option value="pessoal">Pessoal</option>
            </select>
          </FormField>

          <FormField label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="agendado">Agendado</option>
              <option value="realizado">Realizado</option>
              <option value="faltou">Faltou</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </FormField>

          <FormField label="Valor (R$)">
            <input
              type="number"
              step="0.01"
              value={form.valor_bruto}
              onChange={(e) =>
                setForm({
                  ...form,
                  valor_bruto: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </FormField>

        </div>

        <FormField label="Prontuário">
          <select
            value={form.prontuario_status}
            onChange={(e) => setForm({ ...form, prontuario_status: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="pendente">Pendente</option>
            <option value="feito">Feito</option>
            <option value="nao_aplicavel">Não se aplica</option>
          </select>
        </FormField>

        <FormField label="Anotações (salvas criptografadas)">
          <textarea
            rows={4}
            value={form.prontuario_texto}
            onChange={(e) => setForm({ ...form, prontuario_texto: e.target.value })}
            placeholder="ao preencher, marca o prontuário como feito"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </FormField>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={onDelete}
          disabled={pending}
          className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          Excluir
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-600">
            Cancelar
          </button>
          <button
            disabled={pending}
            onClick={() =>
              onSave({
                patient_id: form.patient_id || null,
                tipo: form.tipo,
                valor_bruto: form.valor_bruto === "" ? null : Number(form.valor_bruto),
                status: form.status,
                prontuario_status: form.prontuario_status,
                prontuario_texto: form.prontuario_texto,
                titulo: form.titulo,
              } as any)
            }
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

function CreateDrawer({
  range,
  patients,
  pending,
  onClose,
  onCreate,
}: {
  range: { start: string; end: string };
  patients: Patient[];
  pending: boolean;
  onClose: () => void;
  onCreate: (data: {
    titulo: string;
    tipo: string;
    tipo_atendimento: string;
    duracao_sessao_min: 30 | 50 | 60;
    patient_id?: string | null;
    valor_bruto?: number | null;
    alerta_clinico?: string | null;
    recorrencia?: "nenhuma" | "semanal" | "quinzenal";
    recorrencia_ate?: string;
  }) => void;
}) {
  const [form, setForm] = useState<{
    patient_id: string;
    titulo: string;
    tipo_atendimento: "particular" | "convenio" | "misto" | "bloqueio" | "pessoal";
    duracao_sessao_min: 30 | 50 | 60;
    valor_bruto: number | "";
    alerta_clinico: string;
    recorrencia: "nenhuma" | "semanal" | "quinzenal";
    recorrencia_ate: string;
  }>({
    patient_id: "",
    titulo: "",
    tipo_atendimento: "particular",
    duracao_sessao_min: 50,
    valor_bruto: "",
    alerta_clinico: "",
    recorrencia: "nenhuma",
    recorrencia_ate: "",
  });

  function applyPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    if (!p) {
      setForm((f) => ({ ...f, patient_id: "" }));
      return;
    }
    const tipoAt = (p.tipo_atendimento ?? (p.tipo_default === "plano" ? "convenio" : "particular")) as any;
    const dur: 30 | 50 | 60 = tipoAt === "convenio" ? ((p.duracao_convenio_min as any) ?? 30) : 50;
    const val = tipoAt === "convenio"
      ? (p.valor_convenio ?? p.valor_sessao_default ?? "")
      : (p.valor_particular ?? p.valor_sessao_default ?? "");
    setForm((f) => ({
      ...f,
      patient_id: id,
      tipo_atendimento: tipoAt,
      duracao_sessao_min: dur,
      valor_bruto: val === null ? "" : (val as any),
      titulo: p.nome,
    }));
  }

  function setTipo(t: typeof form.tipo_atendimento) {
    const dur: 30 | 50 | 60 = t === "particular" ? 50 : t === "convenio" ? 30 : form.duracao_sessao_min;
    setForm({ ...form, tipo_atendimento: t, duracao_sessao_min: dur });
  }

  const duracaoOptions: (30 | 50 | 60)[] =
    form.tipo_atendimento === "convenio" ? [30, 60]
    : form.tipo_atendimento === "particular" ? [50]
    : [30, 50, 60];

  const isMulti =
    form.tipo_atendimento === "convenio" && form.duracao_sessao_min === 60;
  const valorTotal =
    form.valor_bruto === "" ? 0 : Number(form.valor_bruto) * (isMulti ? 2 : 1);

  return (
    <Drawer onClose={onClose}>
      <h3 className="mb-1 text-lg font-semibold">Novo agendamento</h3>
      <p className="mb-4 text-xs text-slate-500">
        {new Date(range.start).toLocaleString("pt-BR")} — {new Date(range.end).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="space-y-3">
        <FormField label="Paciente (opcional)">
          <select
            value={form.patient_id}
            onChange={(e) => applyPatient(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">— selecionar —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Título">
          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Nome do paciente ou assunto"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo de atendimento">
            <select
              value={form.tipo_atendimento}
              onChange={(e) => setTipo(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="particular">Particular</option>
              <option value="convenio">Convênio</option>
              <option value="misto">Misto</option>
              <option value="bloqueio">Bloqueio</option>
              <option value="pessoal">Pessoal</option>
            </select>
          </FormField>

          <FormField label="Duração (min)">
            <select
              value={form.duracao_sessao_min}
              onChange={(e) => setForm({ ...form, duracao_sessao_min: Number(e.target.value) as 30 | 50 | 60 })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {duracaoOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </FormField>

          <FormField label={isMulti ? "Valor por sessão (R$)" : "Valor (R$)"}>
            <input
              type="number"
              step="0.01"
              value={form.valor_bruto}
              onChange={(e) =>
                setForm({
                  ...form,
                  valor_bruto: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </FormField>

          {isMulti && (
            <div className="col-span-1">
              <span className="block text-xs text-slate-500">Total (2 sessões)</span>
              <p className="mt-1 px-3 py-2 text-sm font-medium text-brand">
                R$ {valorTotal.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <FormField label="Alerta clínico (opcional)">
          <textarea
            rows={2}
            value={form.alerta_clinico}
            onChange={(e) => setForm({ ...form, alerta_clinico: e.target.value })}
            placeholder="Observação importante para a sessão"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Recorrência">
            <select
              value={form.recorrencia}
              onChange={(e) => setForm({ ...form, recorrencia: e.target.value as any })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="nenhuma">Sem repetir</option>
              <option value="semanal">Toda semana</option>
              <option value="quinzenal">A cada 15 dias</option>
            </select>
          </FormField>
          {form.recorrencia !== "nenhuma" && (
            <FormField label="Repetir até (opcional)">
              <input
                type="date"
                value={form.recorrencia_ate}
                onChange={(e) => setForm({ ...form, recorrencia_ate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </FormField>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-600">
          Cancelar
        </button>
        <button
          disabled={pending || !form.titulo.trim()}
          onClick={() =>
            onCreate({
              titulo: form.titulo,
              tipo: form.tipo_atendimento === "convenio" ? "plano" : form.tipo_atendimento,
              tipo_atendimento: form.tipo_atendimento,
              duracao_sessao_min: form.duracao_sessao_min,
              patient_id: form.patient_id || null,
              valor_bruto: form.valor_bruto === "" ? null : Number(form.valor_bruto),
              alerta_clinico: form.alerta_clinico || null,
              recorrencia: form.recorrencia,
              recorrencia_ate: form.recorrencia_ate || undefined,
            })
          }
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar"}
        </button>
      </div>
    </Drawer>
  );
}

function QuickAddModal({
  patients,
  pending,
  initialPatient,
  onClose,
  onCreate,
}: {
  patients: Patient[];
  pending: boolean;
  initialPatient?: { id: string, name: string } | null;
  onClose: () => void;
  onCreate: (data: any) => void;
}) {
  const initialP = initialPatient ? patients.find(p => p.id === initialPatient.id) : null;
  const initialTipo: "particular" | "convenio" =
    (initialP?.tipo_atendimento as any) === "convenio" ||
    initialP?.tipo_default === "plano" ? "convenio" : "particular";
  const initialDur: 30 | 50 | 60 = initialTipo === "convenio"
    ? ((initialP?.duracao_convenio_min as 30 | 60) ?? 30)
    : 50;
  const initialValor = initialTipo === "convenio"
    ? (initialP?.valor_convenio ?? initialP?.valor_sessao_default ?? 0)
    : (initialP?.valor_particular ?? initialP?.valor_sessao_default ?? 0);

  const [form, setForm] = useState<{
    patient_id: string;
    inicio: string;
    valor_bruto: number;
    titulo: string;
    tipo_atendimento: "particular" | "convenio" | "misto";
    duracao_sessao_min: 30 | 50 | 60;
    alerta_clinico: string;
    recorrencia: "nenhuma" | "semanal" | "quinzenal";
  }>({
    patient_id: initialPatient?.id ?? "",
    inicio: formatISO(new Date()).slice(0, 16),
    valor_bruto: initialValor,
    titulo: initialPatient?.name ?? "",
    tipo_atendimento: initialTipo,
    duracao_sessao_min: initialDur,
    alerta_clinico: "",
    recorrencia: "nenhuma",
  });

  const [search, setSearch] = useState(initialPatient?.name ?? "");
  const filteredPatients = patients.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  function applyPatient(p: Patient) {
    const tipoAt = ((p.tipo_atendimento as any) ?? (p.tipo_default === "plano" ? "convenio" : "particular")) as "particular" | "convenio" | "misto";
    const dur: 30 | 50 | 60 = tipoAt === "convenio" ? ((p.duracao_convenio_min as 30 | 60) ?? 30) : 50;
    const valor = tipoAt === "convenio"
      ? (p.valor_convenio ?? p.valor_sessao_default ?? 0)
      : (p.valor_particular ?? p.valor_sessao_default ?? 0);
    setForm({
      ...form,
      patient_id: p.id,
      valor_bruto: valor,
      titulo: p.nome,
      tipo_atendimento: tipoAt,
      duracao_sessao_min: dur,
    });
    setSearch(p.nome);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="mb-4 text-lg font-bold text-slate-800">Agendamento Rápido</h3>

        <div className="space-y-4">
          <FormField label="Paciente">
            <div className="relative mt-1">
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (form.patient_id) setForm({ ...form, patient_id: "" });
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
              />
              {search && !form.patient_id && (
                <div className="absolute top-full left-0 z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPatient(p)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        {p.nome}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400">Nenhum paciente encontrado</div>
                  )}
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Data e Hora">
            <input
              type="datetime-local"
              value={form.inicio}
              onChange={(e) => setForm({ ...form, inicio: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tipo">
              <select
                value={form.tipo_atendimento}
                onChange={(e) => {
                  const t = e.target.value as typeof form.tipo_atendimento;
                  const dur: 30 | 50 | 60 = t === "particular" ? 50 : t === "convenio" ? 30 : form.duracao_sessao_min;
                  setForm({ ...form, tipo_atendimento: t, duracao_sessao_min: dur });
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="particular">Particular</option>
                <option value="convenio">Convênio</option>
                <option value="misto">Misto</option>
              </select>
            </FormField>
            <FormField label="Duração (min)">
              <select
                value={form.duracao_sessao_min}
                onChange={(e) => setForm({ ...form, duracao_sessao_min: Number(e.target.value) as 30 | 50 | 60 })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {(form.tipo_atendimento === "convenio" ? [30, 60]
                  : form.tipo_atendimento === "particular" ? [50]
                  : [30, 50, 60]).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label={form.tipo_atendimento === "convenio" && form.duracao_sessao_min === 60 ? "Valor por sessão (R$)" : "Valor (R$)"}>
            <input
              type="number"
              value={form.valor_bruto}
              onChange={(e) => setForm({ ...form, valor_bruto: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {form.tipo_atendimento === "convenio" && form.duracao_sessao_min === 60 && (
              <span className="mt-1 block text-[11px] text-brand font-medium">
                Total: R$ {(form.valor_bruto * 2).toFixed(2)} (2 sessões)
              </span>
            )}
          </FormField>

          <FormField label="Recorrência">
            <select
              value={form.recorrencia}
              onChange={(e) => setForm({ ...form, recorrencia: e.target.value as any })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="nenhuma">Sem repetir</option>
              <option value="semanal">Toda semana</option>
              <option value="quinzenal">A cada 15 dias</option>
            </select>
          </FormField>

          <FormField label="Alerta clínico (opcional)">
            <textarea
              rows={2}
              value={form.alerta_clinico}
              onChange={(e) => setForm({ ...form, alerta_clinico: e.target.value })}
              placeholder="Observação importante para a sessão"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </FormField>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            disabled={pending || !form.patient_id || !form.inicio}
            onClick={() => {
              // Envia inicio como ISO local sem offset; a action interpreta em SP
              const fim = new Date(new Date(form.inicio).getTime() + form.duracao_sessao_min * 60000);
              const fimLocal = formatISO(fim);
              onCreate({
                inicio: form.inicio,
                fim: fimLocal,
                titulo: form.titulo,
                tipo: form.tipo_atendimento === "convenio" ? "plano" : form.tipo_atendimento,
                tipo_atendimento: form.tipo_atendimento,
                duracao_sessao_min: form.duracao_sessao_min,
                patient_id: form.patient_id,
                valor_bruto: form.valor_bruto,
                alerta_clinico: form.alerta_clinico || null,
                recorrencia: form.recorrencia,
                percentual_clinica: 0,
              });
            }}
            className="flex-1 rounded-lg bg-brand py-2 text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand/90 disabled:opacity-50"
          >
            {pending ? "Agendando..." : "Agendar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatISO(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
