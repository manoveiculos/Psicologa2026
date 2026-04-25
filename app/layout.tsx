import "./globals.css";
import type { Metadata } from "next";
import Shell from "@/components/Shell";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Psicóloga.app",
  description: "Gestão para consultório de psicologia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Shell>{children}</Shell>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

