"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { QrCode, RefreshCw, Send, LogOut, CheckCircle2, AlertCircle, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { getWhatsAppStatus, getQRCode, disconnectWhatsApp, sendTestMessage } from "./evolution-actions";

interface WhatsAppConnectionProps {
  settings: {
    evolution_url?: string | null;
    evolution_api_key?: string | null;
    evolution_instance?: string | null;
  };
  userPhone?: string;
}

export function WhatsAppConnection({ settings: s, userPhone }: WhatsAppConnectionProps) {
  const [status, setStatus] = useState<"conectado" | "desconectado" | "aguardando" | "erro">("desconectado");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!s.evolution_url || !s.evolution_api_key || !s.evolution_instance) return;
    try {
      const res = await getWhatsAppStatus(s.evolution_url, s.evolution_api_key, s.evolution_instance);
      setStatus(res.status);
      if (res.status === "conectado") {
        setQrCode(null);
      }
    } catch (error) {
      setStatus("erro");
    }
  }, [s]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    let interval: any;
    if (status === "aguardando" || qrCode) {
      interval = setInterval(() => {
        checkStatus();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [status, qrCode, checkStatus]);

  async function handleConnect() {
    if (!s.evolution_url || !s.evolution_api_key || !s.evolution_instance) {
      toast.error("Configure o servidor primeiro em 'Dados Técnicos'.");
      setShowAdvanced(true);
      return;
    }

    startTransition(async () => {
      try {
        const res = await getQRCode(s.evolution_url!, s.evolution_api_key!, s.evolution_instance!);
        if (res.qr) {
          setQrCode(res.qr);
          setStatus("aguardando");
          toast.info("QR Code gerado! Escaneie no seu WhatsApp.");
        }
      } catch (error) {
        toast.error("Falha ao gerar QR Code.");
      }
    });
  }

  async function handleLogout() {
    if (!confirm("Deseja realmente desconectar o WhatsApp?")) return;
    startTransition(async () => {
      try {
        await disconnectWhatsApp(s.evolution_url!, s.evolution_api_key!, s.evolution_instance!);
        setStatus("desconectado");
        setQrCode(null);
        toast.success("Desconectado com sucesso.");
      } catch (error) {
        toast.error("Erro ao desconectar.");
      }
    });
  }

  async function handleTeste() {
    if (!userPhone) {
      toast.error("Configure seu número de WhatsApp primeiro.");
      return;
    }
    startTransition(async () => {
      try {
        await sendTestMessage(s.evolution_url!, s.evolution_api_key!, s.evolution_instance!, userPhone);
        toast.success("Mensagem de teste enviada!");
      } catch (error) {
        toast.error("Erro ao enviar teste.");
      }
    });
  }

  const isConfigured = s.evolution_url && s.evolution_api_key && s.evolution_instance;

  return (
    <div className="space-y-6">
      {/* Card Principal de Conexão */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          
          {/* Lado Esquerdo: QR Code ou Status Icon */}
          <div className="flex-shrink-0">
            {qrCode ? (
              <div className="relative p-2 bg-white rounded-2xl shadow-xl border-4 border-brand/10">
                <img 
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                  alt="WhatsApp QR Code" 
                  className="h-48 w-48 rounded-lg"
                />
              </div>
            ) : (
              <div className={`w-48 h-48 rounded-3xl flex items-center justify-center transition-colors ${
                status === "conectado" ? "bg-emerald-50 text-emerald-500" : 
                status === "erro" ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-300"
              }`}>
                {status === "conectado" ? (
                  <CheckCircle2 className="w-20 h-20" />
                ) : (
                  <QrCode className="w-20 h-20" />
                )}
              </div>
            )}
          </div>

          {/* Lado Direito: Info e Ações */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  status === "conectado" ? "bg-emerald-100 text-emerald-700" :
                  status === "aguardando" ? "bg-amber-100 text-amber-700 animate-pulse" :
                  status === "erro" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {status === "conectado" ? "Conectado" : 
                   status === "aguardando" ? "Aguardando Scanner" :
                   status === "erro" ? "Erro de Conexão" : "Desconectado"}
                </span>
                <button onClick={checkStatus} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
                </button>
              </div>
              <h4 className="text-xl font-bold text-slate-800">
                {status === "conectado" ? "WhatsApp Ativo" : "Scanner do WhatsApp"}
              </h4>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                {status === "conectado" 
                  ? "Sua clínica está pronta para enviar lembretes automáticos." 
                  : "Escaneie o código com seu WhatsApp para ativar as notificações automáticas."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {status === "conectado" ? (
                <>
                  <button onClick={handleTeste} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-all">
                    <Send className="w-4 h-4" /> Testar Envio
                  </button>
                  <button onClick={handleLogout} disabled={isPending} className="flex items-center gap-2 px-4 py-2 border border-red-100 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-all">
                    <LogOut className="w-4 h-4" /> Desconectar
                  </button>
                </>
              ) : (
                <button onClick={handleConnect} disabled={isPending} className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-xl text-sm font-bold shadow-lg hover:bg-brand/90 transition-all active:scale-95">
                  <QrCode className="w-4 h-4" /> {qrCode ? "Gerar Novo QR Code" : "Iniciar Scanner"}
                </button>
              )}
            </div>
          </div>
        </div>

        {!isConfigured && (
          <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>O servidor ainda não foi configurado. Clique em <strong>Dados Técnicos</strong> abaixo para começar.</span>
          </div>
        )}
      </div>

      {/* Accordion para Configurações Avançadas */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors text-slate-600"
        >
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <Settings2 className="w-4 h-4" />
            Dados Técnicos do Servidor
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showAdvanced && (
          <div className="p-6 bg-white border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-500">
              Configure a <strong>URL da API</strong>, <strong>API Key</strong> e o <strong>Nome da Instância</strong> nos campos de formulário abaixo e salve para habilitar o scanner.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
