import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/RootProviders";

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
      <body className={`${inter.className} min-h-screen bg-gray-50 text-gray-900`}>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}

