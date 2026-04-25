"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, Wallet, Settings, Home, LogOut, Clock, Search, Plus } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import CommandMenu from "./CommandMenu";
import SpeedDial from "./SpeedDial";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/horarios", label: "Horários livres", icon: Clock },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/login")) return <>{children}</>;

  async function logout() {
    const { auth } = await import("@/lib/firebase");
    await auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    location.href = "/login";
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-brand tracking-tight">Psicóloga.app</h1>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Gestão de Consultório</p>
        </div>

        {/* Atalho de Busca Global */}
        <button 
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true });
            document.dispatchEvent(event);
          }}
          className="mb-6 flex items-center justify-between w-full rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs text-slate-400 hover:border-brand/20 hover:bg-white transition-all group"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Buscar...</span>
          </div>
          <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] border shadow-sm font-bold group-hover:text-brand transition-colors">⌘K</kbd>
        </button>

        <nav className="flex-1 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-slate-700 hover:bg-brand-soft hover:text-brand"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>
      <main className="flex-1 p-8 bg-slate-50/30 overflow-y-auto">
        {children}
      </main>
      <CommandMenu />
      <SpeedDial />
    </div>
  );
}
