"use client";

import { useState, useTransition } from "react";
import { Zap, RefreshCw, CheckCircle2, Download } from "lucide-react";
import { setupGoogleWebhook, forceFullSync } from "@/app/agenda/actions";
import { toast } from "sonner";

interface RealTimeSyncButtonProps {
  isActivated: boolean;
  expiration?: string | null;
}

export function RealTimeSyncButton({ isActivated: initialActivated, expiration }: RealTimeSyncButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [activated, setActivated] = useState(initialActivated);

  async function handleActivate() {
    startTransition(async () => {
      try {
        await setupGoogleWebhook();
        setActivated(true);
        toast.success("Sincronização em tempo real ativada!");
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  async function handleImport() {
    startTransition(async () => {
      try {
        const r = await forceFullSync();
        toast.success(`${r.imported} eventos importados do Google.`);
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  if (activated) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Tempo Real Ativo
        </div>
        {expiration && (
          <p className="text-[10px] text-slate-400 ml-1">
            Expira em: {new Date(Number(expiration)).toLocaleDateString()}
          </p>
        )}
        <button
          onClick={handleImport}
          disabled={isPending}
          className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          title="Baixa do Google os eventos dos últimos 7 dias e próximos 60 dias e atualiza a agenda local."
        >
          {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {isPending ? "Importando..." : "Importar eventos do Google agora"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleActivate}
      disabled={isPending}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-50"
    >
      {isPending ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Zap className="h-4 w-4 text-yellow-400 fill-yellow-400" />
      )}
      Ativar Tempo Real
    </button>
  );
}
