"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  FileText, 
  Calendar, 
  CreditCard, 
  User, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  X,
  Save,
  Upload,
  Trash2,
  FileIcon,
  Download,
  Edit,
  MessageCircle,
  Search,
  TrendingUp,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BRL } from "@/lib/utils";
import { updateAppointmentDetails } from "@/app/agenda/actions";
import { atualizarDadosPaciente, uploadAnexoPaciente, deletarAnexoPaciente, deletarProntuario, deletarAgendamento } from "./actions";

export default function PatientTabs({ patient, appointments, documents }: { patient: any, appointments: any[], documents: any[] }) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "evolucao");
  const [mesFiltro, setMesFiltro] = useState<string>("todos");
  const [anoFiltro, setAnoFiltro] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const appointmentsFiltrados = appointments.filter(a => {
    if (anoFiltro === "todos" && mesFiltro === "todos") return true;
    const data = new Date(a.inicio);
    const matchAno = anoFiltro === "todos" || data.getFullYear().toString() === anoFiltro;
    const matchMes = mesFiltro === "todos" || (data.getMonth() + 1).toString().padStart(2, '0') === mesFiltro;
    return matchAno && matchMes;
  });

  const tabs = [
    { id: "evolucao", label: "Evolução Clínica", icon: FileText },
    { id: "agenda", label: "Histórico de Sessões", icon: Calendar },
    { id: "financeiro", label: "Financeiro Individual", icon: CreditCard },
    { id: "dados", label: "Dados Cadastrais", icon: User },
  ];

  return (
    <div className="space-y-6">
      {/* Navegação das Abas e Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-2xl border border-slate-200 self-start">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? "bg-white text-brand shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filtros de Período (visíveis em Agenda e Financeiro) */}
        {(activeTab === "agenda" || activeTab === "financeiro") && (
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <select 
              value={mesFiltro} 
              onChange={(e) => setMesFiltro(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-transparent border-none focus:ring-0 cursor-pointer px-3"
            >
              <option value="todos">Todos os Meses</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                  {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
                </option>
              ))}
            </select>
            <div className="h-4 w-[1px] bg-slate-200" />
            <select 
              value={anoFiltro} 
              onChange={(e) => setAnoFiltro(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-transparent border-none focus:ring-0 cursor-pointer px-3"
            >
              <option value="todos">Todos os Anos</option>
              {["2023", "2024", "2025", "2026"].map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Conteúdo das Abas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm min-h-[400px]">
        {activeTab === "evolucao" && <EvolucaoTab appointments={appointments} patient={patient} />}
        {activeTab === "agenda" && <AgendaTab appointments={appointmentsFiltrados} />}
        {activeTab === "financeiro" && <FinanceiroTab appointments={appointments} appointmentsFiltrados={appointmentsFiltrados} patient={patient} />}
        {activeTab === "dados" && <DadosTab patient={patient} documents={documents} />}
      </div>
    </div>
  );
}

function EvolucaoTab({ appointments, patient }: { appointments: any[], patient: any }) {
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<any>(null);
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get("edit") === "new") {
      const firstPending = appointments.find(a => a.status === 'realizado' && !a.note);
      if (firstPending) {
        setEditing(firstPending);
        setTexto("");
      }
    }
  }, [searchParams, appointments]);

  const notes = appointments
    .filter(a => a.note)
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

  const pendencias = appointments
    .filter(a => a.status === 'realizado' && !a.note)
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

  async function handleSalvar() {
    if (!editing || !texto.trim()) return;
    startTransition(async () => {
      try {
        await updateAppointmentDetails({
          id: editing.id,
          patient_id: patient.id,
          tipo: editing.tipo,
          status: editing.status,
          prontuario_status: "feito",
          prontuario_texto: texto,
        });
        setEditing(null);
        setTexto("");
      } catch (error) {
        alert("Erro ao salvar evolução.");
      }
    });
  }

  function startEdit(appt: any) {
    setEditing(appt);
    setTexto(appt.note?.content || "");
  }

  return (
    <div className="space-y-8">
      {pendencias.length > 0 && (
        <div className="space-y-3">
          {pendencias.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-amber-50 p-4 border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">Sessão pendente de documentação</p>
                  <p className="text-xs text-amber-600 font-medium">Realizada em {format(new Date(p.inicio), "dd/MM/yyyy")}</p>
                </div>
              </div>
              <button 
                onClick={() => startEdit(p)}
                className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
              >
                Escrever agora
              </button>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && pendencias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-slate-50 p-6 mb-4 text-slate-300">
            <FileText className="h-12 w-12" />
          </div>
          <p className="text-slate-500 font-medium">Nenhuma evolução registrada</p>
        </div>
      ) : (
        <div className="space-y-10">
          {notes.map((a) => (
            <div key={a.id} className="relative pl-10 border-l-2 border-slate-100 pb-10 last:pb-0">
              <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-white border-2 border-brand shadow-sm" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">
                    {format(new Date(a.inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Sessão {a.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(a)} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-brand transition-colors">
                    <FileText className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm("Excluir esta evolução?")) {
                        await deletarProntuario(a.note.id, patient.id);
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">{a.note.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-slate-800">Evolução Clínica</h4>
                <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">{patient.nome} · {format(new Date(editing.inicio), "dd/MM/yyyy")}</p>
              </div>
              <button onClick={() => setEditing(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              autoFocus
              className="w-full rounded-xl border border-slate-200 p-5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand focus:outline-none transition-all resize-none bg-slate-50/50 leading-relaxed text-slate-700"
              rows={12}
              placeholder="Descreva detalhadamente a evolução clínica..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-lg px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSalvar} disabled={isPending || !texto.trim()} className="rounded-xl bg-brand px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand/90 disabled:opacity-50 transition-all flex items-center gap-2">
                {isPending ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Evolução</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaTab({ appointments }: { appointments: any[] }) {
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  async function handleUpdateAppt(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    startTransition(async () => {
      try {
        await updateAppointmentDetails({
          id: editingAppt.id,
          status: formData.get("status") as "agendado" | "realizado" | "faltou" | "cancelado",
          tipo: editingAppt.tipo,
          valor_bruto: Number(formData.get("valor")),
          prontuario_status: editingAppt.prontuario_status || "pendente"
        });
        setEditingAppt(null);
      } catch (e) { alert("Erro ao salvar."); }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/50 text-left text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          <tr>
            <th className="px-6 py-4">Data</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Pagamento</th>
            <th className="px-6 py-4">Modalidade</th>
            <th className="px-6 py-4">Profissional</th>
            <th className="px-6 py-4 text-right">Valor</th>
            <th className="px-6 py-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {appointments.length === 0 ? (
            <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Nenhum agendamento encontrado.</td></tr>
          ) : (
            appointments.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-700">{format(new Date(a.inicio), "dd MMM yyyy", { locale: ptBR })}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                    a.status === 'realizado' ? 'bg-green-50 text-green-700 border-green-100' :
                    a.status === 'faltou' ? 'bg-red-50 text-red-700 border-red-100' :
                    'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    {a.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase ${a.status_recebimento === 'pago' ? 'text-green-500' : 'text-red-400'}`}>
                    {a.status_recebimento || 'pendente'}
                  </span>
                </td>
                <td className="px-6 py-4 capitalize text-slate-500 font-medium">{a.tipo}</td>
                <td className="px-6 py-4 text-slate-500 font-medium">{a.id_profissional === a.user_id ? "Clínica (Você)" : "Externo"}</td>
                <td className="px-6 py-4 text-right font-bold text-slate-700">{BRL.format(Number(a.valor_bruto))}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setEditingAppt(a)}
                      className="p-1.5 text-slate-400 hover:text-brand transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm("Excluir este agendamento?")) {
                          await deletarAgendamento(a.id, a.patient_id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {editingAppt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Editar Sessão</h3>
            <form onSubmit={handleUpdateAppt} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Status da Sessão</label>
                <select name="status" defaultValue={editingAppt.status} className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none bg-white">
                  <option value="confirmado">Confirmado</option>
                  <option value="realizado">Realizado</option>
                  <option value="faltou">Faltou</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Status de Pagamento</label>
                <select name="pagamento" defaultValue={editingAppt.status_recebimento || "pendente"} className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none bg-white">
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Valor Cobrado</label>
                <input name="valor" type="number" step="0.01" defaultValue={editingAppt.valor_bruto} className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-brand focus:outline-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingAppt(null)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={isPending} className="flex-1 bg-brand text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-brand/90 disabled:opacity-50">
                  {isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceiroTab({ appointments, appointmentsFiltrados, patient }: { appointments: any[], appointmentsFiltrados: any[], patient: any }) {
  const ltv = appointments
    .filter(a => a.status === 'realizado' && a.status_recebimento === 'pago')
    .reduce((acc, a) => acc + Number(a.valor_bruto), 0);

  const realizadosFiltrados = appointmentsFiltrados.filter(a => a.status === 'realizado');
  const totalRecebido = realizadosFiltrados.filter(a => a.status_recebimento === 'pago').reduce((acc, a) => acc + Number(a.valor_bruto), 0);
  const totalPendente = realizadosFiltrados.filter(a => a.status_recebimento !== 'pago').reduce((acc, a) => acc + Number(a.valor_bruto), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-brand/5 p-6 border border-brand/10">
          <p className="text-[10px] font-bold text-brand uppercase mb-1">LTV Total</p>
          <p className="text-2xl font-bold text-slate-800">{BRL.format(ltv)}</p>
        </div>
        <div className="rounded-2xl bg-green-50/50 p-6 border border-green-100">
          <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Recebido</p>
          <p className="text-2xl font-bold text-green-700">{BRL.format(totalRecebido)}</p>
        </div>
        <div className="rounded-2xl bg-orange-50/50 p-6 border border-orange-100">
          <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Pendente</p>
          <p className="text-2xl font-bold text-orange-700">{BRL.format(totalPendente)}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-100">
        <div className="divide-y divide-slate-50">
          {realizadosFiltrados.map((a) => (
            <div key={a.id} className={`px-6 py-4 flex items-center justify-between ${a.status_recebimento !== 'pago' ? 'bg-red-50/30' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${a.status_recebimento === 'pago' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><CreditCard className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{format(new Date(a.inicio), "dd MMM yyyy", { locale: ptBR })}</p>
                  <p className="text-xs text-slate-400 capitalize">{a.tipo}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{BRL.format(Number(a.valor_bruto))}</p>
                <span className={`text-[10px] font-bold uppercase ${a.status_recebimento === 'pago' ? 'text-green-500' : 'text-red-500'}`}>{a.status_recebimento === 'pago' ? 'Pago' : 'Pendente'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DadosTab({ patient, documents }: { patient: any, documents: any[] }) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nome: patient.nome || "",
    telefone_e164: patient.telefone_e164 || "",
    tipo_default: patient.tipo_default || "particular",
    tipo_atendimento: patient.tipo_atendimento || (patient.tipo_default === "plano" ? "convenio" : "particular"),
    convenio: patient.convenio || "",
    convenio_nome: patient.convenio_nome || patient.convenio || "",
    valor_sessao_default: patient.valor_sessao_default || "",
    valor_convenio: patient.valor_convenio ?? "",
    duracao_convenio_min: patient.duracao_convenio_min ?? 30,
    valor_particular: patient.valor_particular ?? "",
    duracao_particular_min: patient.duracao_particular_min ?? 50,
    cpf: patient.cpf || "",
    data_nascimento: patient.data_nascimento || "",
    endereco: patient.endereco || "",
    nome_responsavel: patient.nome_responsavel || "",
    profissao: patient.profissao || "",
    contato_emergencia: patient.contato_emergencia || "",
    queixa_principal: patient.queixa_principal || "",
  });

  async function handleSalvar() {
    startTransition(async () => {
      try {
        await atualizarDadosPaciente(patient.id, formData);
        toast.success("Dados atualizados com sucesso!");
      } catch (error) { 
        console.error(error);
        toast.error("Erro ao salvar os dados."); 
      }
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      try {
        await uploadAnexoPaciente(patient.id, file, file.name);
        toast.success("Documento enviado!");
      } catch (error) { toast.error("Erro no upload."); }
    });
  }

  async function handleDeletarArquivo(doc: any) {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    startTransition(async () => {
      try { 
        await deletarAnexoPaciente(doc.id, doc.file_path, patient.id); 
        toast.success("Documento excluído.");
      } catch (error) { toast.error("Erro ao excluir."); }
    });
  }

  return (
    <div className="space-y-12">
      <div className="rounded-2xl bg-brand/5 p-6 border border-brand/10">
        <label className="text-[10px] font-bold text-brand uppercase tracking-widest mb-3 block">Queixa Principal / Motivo da Consulta</label>
        <textarea 
          value={formData.queixa_principal}
          onChange={(e) => setFormData({...formData, queixa_principal: e.target.value})}
          placeholder="Motivo da consulta..."
          className="w-full bg-transparent border-none focus:ring-0 text-slate-700 text-sm min-h-[80px] resize-none p-0"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Nome" value={formData.nome} onChange={(v) => setFormData({...formData, nome: v})} />
              <InputGroup label="Telefone" value={formData.telefone_e164} onChange={(v) => setFormData({...formData, telefone_e164: v})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo de atendimento</label>
              <select
                value={formData.tipo_atendimento}
                onChange={(e) => {
                  const t = e.target.value;
                  setFormData({
                    ...formData,
                    tipo_atendimento: t,
                    tipo_default: t === "convenio" ? "plano" : t === "misto" ? "plano" : "particular",
                  });
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none bg-white"
              >
                <option value="particular">Particular</option>
                <option value="convenio">Convênio</option>
                <option value="misto">Misto (Particular + Convênio)</option>
              </select>
            </div>

            {(formData.tipo_atendimento === "convenio" || formData.tipo_atendimento === "misto") && (
              <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Convênio</p>
                <InputGroup label="Nome do convênio (ex: Unimed)" value={formData.convenio_nome} onChange={(v) => setFormData({ ...formData, convenio_nome: v, convenio: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <InputGroup label="Valor por sessão (R$)" type="number" value={String(formData.valor_convenio)} onChange={(v) => setFormData({ ...formData, valor_convenio: v as any })} />
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Duração (min)</label>
                    <select
                      value={formData.duracao_convenio_min}
                      onChange={(e) => setFormData({ ...formData, duracao_convenio_min: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    >
                      <option value={30}>30</option>
                      <option value={60}>60</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {(formData.tipo_atendimento === "particular" || formData.tipo_atendimento === "misto") && (
              <div className="rounded-lg bg-violet-50/50 border border-violet-100 p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Particular</p>
                <div className="grid grid-cols-2 gap-3">
                  <InputGroup label="Valor por sessão (R$)" type="number" value={String(formData.valor_particular)} onChange={(v) => setFormData({ ...formData, valor_particular: v as any })} />
                  <InputGroup label="Duração (min)" type="number" value={String(formData.duracao_particular_min)} onChange={(v) => setFormData({ ...formData, duracao_particular_min: Number(v) || 50 })} />
                </div>
              </div>
            )}

            <InputGroup label="Valor padrão (legado)" type="number" value={formData.valor_sessao_default.toString()} onChange={(v) => setFormData({...formData, valor_sessao_default: v})} />
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="CPF" value={formData.cpf} onChange={(v) => setFormData({...formData, cpf: v})} />
              <InputGroup label="Nascimento" type="date" value={formData.data_nascimento} onChange={(v) => setFormData({...formData, data_nascimento: v})} />
            </div>
            <InputGroup label="Profissão" value={formData.profissao} onChange={(v) => setFormData({...formData, profissao: v})} />
            <InputGroup label="Responsável" value={formData.nome_responsavel} onChange={(v) => setFormData({...formData, nome_responsavel: v})} />
            <InputGroup label="Endereço" value={formData.endereco} onChange={(v) => setFormData({...formData, endereco: v})} />
            <InputGroup label="Contato Emergência" value={formData.contato_emergencia} onChange={(v) => setFormData({...formData, contato_emergencia: v})} />
          </div>
          <button onClick={handleSalvar} disabled={isPending} className="w-full bg-brand text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-brand/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {isPending ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Alterações</>}
          </button>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="text-sm font-bold text-slate-800">Documentos</h4>
            <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-brand flex items-center gap-2 transition-colors hover:opacity-80"><Upload className="h-3.5 w-3.5" /> Upload</button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          </div>
          <div className="space-y-3">
            {documents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">Nenhum documento anexado.</p>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white group hover:border-brand/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                      <FileIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{doc.name}</p>
                      <p className="text-[10px] text-slate-400">{format(new Date(doc.created_at), "dd/MM/yyyy")}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeletarArquivo(doc)} className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, type = "text" }: { label: string, value: any, onChange: (v: string) => void, type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type} 
        value={value ?? ""} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all bg-white" 
      />
    </div>
  );
}


function StatusBadge({ status }: { status: string }) {
  const styles: any = { realizado: "bg-green-50 text-green-600 border-green-100", agendado: "bg-blue-50 text-blue-600 border-blue-100", faltou: "bg-red-50 text-red-600 border-red-100", cancelado: "bg-slate-50 text-slate-400 border-slate-100" };
  const labels: any = { realizado: "Realizado", agendado: "Agendado", faltou: "Faltou", cancelado: "Cancelado" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[status] || styles.cancelado}`}>{labels[status] || status}</span>;
}
