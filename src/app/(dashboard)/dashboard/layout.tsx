"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import Link from "next/link";
import SubscriptionModal from "@/components/SubscriptionModal";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import SubscriptionButton from "@/components/SubscriptionButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, logout, user, hasActiveSubscription } =
    useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    // Show subscription modal if user is authenticated but doesn't have active subscription
    // Only show once per session
    if (
      !loading &&
      isAuthenticated &&
      !hasActiveSubscription &&
      !showSubscriptionModal
    ) {
      const hasShownModal = sessionStorage.getItem("subscriptionModalShown");
      if (!hasShownModal) {
        setShowSubscriptionModal(true);
        sessionStorage.setItem("subscriptionModalShown", "true");
      }
    }
  }, [loading, isAuthenticated, hasActiveSubscription, showSubscriptionModal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      <SubscriptionBanner />
      <nav className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">
                  <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    Fineixo
                  </span>
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === "/dashboard"
                      ? "border-emerald-400 text-slate-100"
                      : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/credit-cards"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === "/dashboard/credit-cards"
                      ? "border-emerald-400 text-slate-100"
                      : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  Cartões
                </Link>
                <Link
                  href="/dashboard/debts"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === "/dashboard/debts"
                      ? "border-emerald-400 text-slate-100"
                      : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  Dívidas
                </Link>
                <Link
                  href="/dashboard/categories"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === "/dashboard/categories"
                      ? "border-emerald-400 text-slate-100"
                      : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  Categorias
                </Link>
                <Link
                  href="/dashboard/accounts"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === "/dashboard/accounts"
                      ? "border-emerald-400 text-slate-100"
                      : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  Contas
                </Link>
                <Link
                  href="/dashboard/wallet"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === "/dashboard/wallet"
                      ? "border-emerald-400 text-slate-100"
                      : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  Carteira
                </Link>
                <Link
                  href="/dashboard/transactions"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === "/dashboard/transactions"
                      ? "border-emerald-400 text-slate-100"
                      : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  Transações
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/subscription"
                className="text-sm font-medium text-emerald-300 hover:text-emerald-200"
              >
                Assinatura
              </Link>
              <span className="text-sm text-slate-200">{user?.name}</span>
              <button
                onClick={logout}
                className="text-sm text-slate-400 hover:text-slate-100"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
      <SubscriptionButton />
    </div>
  );
}
