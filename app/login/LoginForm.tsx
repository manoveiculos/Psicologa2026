"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Chrome, Mail, AlertCircle } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error");

  useEffect(() => {
    if (errorType === "unauthorized") {
      setMsg("Acesso Negado: Este e-mail não tem permissão para acessar o sistema.");
      setStatus("error");
    } else if (errorType === "callback") {
      setMsg("Erro ao processar login. Tente novamente.");
      setStatus("error");
    }
  }, [errorType]);

  async function loginGoogle() {
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      }
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand tracking-tight">Psicóloga.app</h1>
          <p className="mt-2 text-slate-500 font-medium">Gestão Inteligente para seu Consultório</p>
        </div>

        {status === "error" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 border border-red-100 text-red-700 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{msg}</p>
          </div>
        )}

        <div className="space-y-6">
          <button
            onClick={loginGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
          >
            <Chrome className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
            Entrar com Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold tracking-widest">ou usar e-mail</span>
            </div>
          </div>

          {status === "sent" ? (
            <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100 text-center animate-in zoom-in duration-300">
              <Mail className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-emerald-800 font-medium">
                Link enviado para <span className="font-bold underline">{email}</span>
              </p>
              <p className="text-xs text-emerald-600 mt-1">Verifique sua caixa de entrada e spam.</p>
              <button onClick={() => setStatus("idle")} className="mt-4 text-xs font-bold text-emerald-700 hover:underline">Tentar outro e-mail</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Seu e-mail profissional</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
              </div>
              <button
                disabled={status === "sending"}
                className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand/90 disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                {status === "sending" ? "Enviando link..." : "Receber Link de Acesso"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 font-medium">
          Acesso restrito a profissionais autorizados.
        </p>
      </div>
    </div>
  );
}
