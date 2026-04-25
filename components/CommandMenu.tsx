"use client";

import { useEffect, useState } from "react";
import { 
  Search, 
  Home, 
  Calendar, 
  Users, 
  Wallet, 
  Settings, 
  Plus, 
  MessageCircle,
  Command as CommandIcon,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  const actions = [
    { label: "Ir para Dashboard", icon: Home, href: "/" },
    { label: "Ver Agenda", icon: Calendar, href: "/agenda" },
    { label: "Lista de Pacientes", icon: Users, href: "/pacientes" },
    { label: "Gestão Financeira", icon: Wallet, href: "/financeiro" },
    { label: "Configurações", icon: Settings, href: "/configuracoes" },
    { divider: true },
    { label: "Novo Agendamento", icon: Plus, href: "/agenda?action=new" },
    { label: "Cadastrar Paciente", icon: Users, href: "/pacientes?action=new" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-20">
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={() => setOpen(false)} 
      />
      
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center border-b border-slate-100 px-4">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus
            placeholder="O que você está procurando? (CMD+K)"
            className="h-14 w-full bg-transparent px-3 text-sm outline-none text-slate-700"
          />
          <kbd className="hidden sm:flex h-6 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Navegação Rápida
          </div>
          <div className="space-y-1">
            {actions.map((action, i) => {
              if (action.divider) return <div key={i} className="my-2 h-[1px] bg-slate-100" />;
              const Icon = action.icon!;
              return (
                <button
                  key={action.label}
                  onClick={() => {
                    router.push(action.href!);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand transition-colors text-left"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-brand">
                    <Icon className="h-4 w-4" />
                  </div>
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-[10px] text-slate-400 font-bold">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><CommandIcon className="h-3 w-3" /> + K para abrir</span>
            <span className="flex items-center gap-1">Enter para selecionar</span>
          </div>
          <button onClick={() => setOpen(false)} className="hover:text-slate-600 flex items-center gap-1">
            <X className="h-3 w-3" /> Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
