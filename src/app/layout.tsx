import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FineixoApp - Gestão Financeira Pessoal",
  description: "Aplicação completa para gestão de finanças pessoais",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

