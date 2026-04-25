"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { isEmailAllowed } from "@/lib/auth-config";

export default function LoginForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorType = searchParams.get("error");

  useEffect(() => {
    if (errorType === "unauthorized") {
      setMsg("Acesso Negado: Este e-mail não tem permissão para acessar o sistema.");
      setStatus("error");
    }
  }, [errorType]);

  async function loginGoogle() {
    setStatus("loading");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!isEmailAllowed(user.email ?? "")) {
        await auth.signOut();
        setMsg("Acesso Negado: Este e-mail não está na lista de profissionais autorizados.");
        setStatus("error");
        return;
      }

      // Salvar sessão no cookie via API
      const idToken = await user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });

      router.push("/");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      setMsg("Erro ao entrar com Google. Verifique sua conexão ou tente novamente.");
      setStatus("error");
    } finally {
      if (status !== "error") setStatus("idle");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200/60">
        <div className="mb-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/5 mb-4">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-brand" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1 className="text-4xl font-black text-brand tracking-tight mb-2">Psicóloga.app</h1>
          <p className="text-slate-500 font-medium">Gestão Inteligente para seu Consultório</p>
        </div>

        {status === "error" && (
          <div className="mb-8 flex items-start gap-3 rounded-xl bg-red-50 p-4 border border-red-100 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{msg}</p>
          </div>
        )}

        <div className="space-y-6">
          <button
            onClick={loginGoogle}
            disabled={status === "loading"}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-6 py-4 text-base font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm active:scale-[0.98] disabled:opacity-70"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {status === "loading" ? "Conectando..." : "Entrar com Google"}
          </button>

          <div className="flex flex-col items-center gap-1">
            <span className="h-1 w-12 rounded-full bg-slate-100"></span>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2">
              Somente Profissionais Autorizados
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Sistema Seguro & Criptografado
          </p>
        </div>
      </div>
    </div>
  );
}
