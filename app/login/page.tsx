import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-300 text-xl font-bold">Carregando...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
