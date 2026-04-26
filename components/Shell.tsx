"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, Users, Wallet, Settings, Home, LogOut, Clock, Search, Menu, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import CommandMenu from "./CommandMenu";
import SpeedDial from "./SpeedDial";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/horarios", label: "Horários", icon: Clock },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/financeiro", label: "Finanças", icon: Wallet },
  { href: "/configuracoes", label: "Ajustes", icon: Settings },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (pathname?.startsWith("/login")) return <>{children}</>;

  async function logout() {
    await auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    location.href = "/login";
  }

  const NavLink = ({ href, label, icon: Icon, onClick }: any) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
          active
            ? "bg-brand text-white shadow-lg shadow-brand/20"
            : "text-slate-600 hover:bg-slate-50 hover:text-brand"
        }`}
      >
        <Icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-400"}`} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-200 bg-white p-6 sticky top-0 h-screen">
        <div className="mb-10">
          <h1 className="text-2xl font-black text-brand tracking-tight">Psicóloga<span className="text-slate-300">.app</span></h1>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Gestão Inteligente</p>
        </div>

        <nav className="flex-1 space-y-2">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white p-6 shadow-2xl transition-transform lg:hidden ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-2xl font-black text-brand tracking-tight">Psicóloga.app</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="space-y-2">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} onClick={() => setIsSidebarOpen(false)} />
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Header Mobile */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold text-brand">Psicóloga.app</h1>
          <div className="w-10 h-10 rounded-full bg-slate-100" />
        </header>

        <main className="flex-1 p-4 md:p-8 lg:p-12">
          {children}
        </main>

        {/* Bottom Nav Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white/80 backdrop-blur-md px-2 lg:hidden">
          {nav.slice(0, 5).map(({ href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                  active ? "text-brand" : "text-slate-400"
                }`}
              >
                <Icon className="h-6 w-6" />
              </Link>
            );
          })}
        </nav>
      </div>

      <CommandMenu />
      <SpeedDial />
    </div>
  );
}
