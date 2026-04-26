"use client";

import { useTransition } from "react";
import { desconectarGoogleAction } from "./actions";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function DisconnectGoogleButton() {
  const [isPending, startTransition] = useTransition();

  async function handleDisconnect() {
    if (!confirm("Tem certeza que deseja desconectar sua agenda? Isso interromperá a sincronização em tempo real.")) {
      return;
    }

    startTransition(async () => {
      try {
        await desconectarGoogleAction();
        toast.success("Agenda desconectada! Recarregando...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err: any) {
        toast.error("Erro ao desconectar: " + err.message);
      }
    });
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={isPending}
      className="w-full text-xs font-bold text-red-500 hover:text-red-600 hover:underline transition-colors text-center flex items-center justify-center gap-2"
    >
      {isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
      Desconectar agenda atual
    </button>
  );
}
