"use client";

import { useState } from "react";
import { Plus, Users, Calendar, Wallet, Search, X } from "lucide-react";
import Link from "next/link";

export default function SpeedDial() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { label: "Novo Agendamento", icon: Calendar, href: "/agenda?action=new", color: "bg-brand" },
    { label: "Novo Paciente", icon: Users, href: "/pacientes?action=new", color: "bg-blue-600" },
    { label: "Lançar Financeiro", icon: Wallet, href: "/financeiro", color: "bg-green-600" },
    { 
      label: "Busca Rápida", 
      icon: Search, 
      onClick: () => {
        const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true });
        document.dispatchEvent(event);
      },
      color: "bg-slate-700" 
    },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[80] flex flex-col items-end gap-3">
      {/* Menu de Ações */}
      {isOpen && (
        <div className="flex flex-col items-end gap-3 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-200">
          {actions.map((action, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">
                {action.label}
              </span>
              {action.href ? (
                <Link
                  href={action.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl hover:scale-110 transition-all ${action.color}`}
                >
                  <action.icon className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  onClick={() => {
                    action.onClick?.();
                    setIsOpen(false);
                  }}
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl hover:scale-110 transition-all ${action.color}`}
                >
                  <action.icon className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botão Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 ${
          isOpen ? "bg-slate-800 text-white rotate-45" : "bg-brand text-white"
        }`}
      >
        <Plus className="h-8 w-8" />
      </button>

      {/* Backdrop (opcional) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[-1] bg-transparent" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  );
}
