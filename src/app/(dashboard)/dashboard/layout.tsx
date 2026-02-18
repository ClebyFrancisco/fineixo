"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import Link from "next/link";
import SubscriptionModal from "@/components/SubscriptionModal";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import SubscriptionButton from "@/components/SubscriptionButton";
import { useTheme } from "@/hooks/useTheme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, logout, user, hasActiveSubscription } =
    useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  const isDark = theme === "dark";

  const navLinkClasses = (href: string) => {
    const isActive = pathname === href;
    if (isDark) {
      return `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
        isActive
          ? "border-emerald-400 text-slate-100"
          : "border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100"
      }`;
    }
    return `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
      isActive
        ? "border-blue-500 text-gray-900"
        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
    }`;
  };

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
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      <SubscriptionBanner />
      <nav
        className={
          isDark
            ? "border-b border-white/10 bg-slate-900/80 backdrop-blur"
            : "border-b border-gray-200 bg-white"
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">
                  <span
                    className={`bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent`}
                  >
                    Fineixo
                  </span>
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className={navLinkClasses("/dashboard")}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/debts"
                  className={navLinkClasses("/dashboard/debts")}
                >
                  Dívidas
                </Link>
                <Link
                  href="/dashboard/credit-cards"
                  className={navLinkClasses("/dashboard/credit-cards")}
                >
                  Cartões
                </Link>

                <Link
                  href="/dashboard/accounts"
                  className={navLinkClasses("/dashboard/accounts")}
                >
                  Contas
                </Link>
                <Link
                  href="/dashboard/wallet"
                  className={navLinkClasses("/dashboard/wallet")}
                >
                  Carteira
                </Link>
                <Link
                  href="/dashboard/transactions"
                  className={navLinkClasses("/dashboard/transactions")}
                >
                  Transações
                </Link>
                <Link
                  href="/dashboard/categories"
                  className={navLinkClasses("/dashboard/categories")}
                >
                  Categorias
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 text-sm font-semibold">
                    {user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span
                      className={`text-xs font-medium ${
                        isDark ? "text-slate-100" : "text-gray-900"
                      }`}
                    >
                      {user?.name || "Usuário"}
                    </span>
                    {user?.email && (
                      <span
                        className={`text-[11px] ${
                          isDark ? "text-slate-400" : "text-gray-500"
                        }`}
                      >
                        {user.email}
                      </span>
                    )}
                  </div>
                </button>
                {isProfileOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-56 rounded-md shadow-lg z-20 ${
                      isDark
                        ? "bg-slate-900/95 border border-white/10 backdrop-blur"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <div
                      className={`px-4 py-3 border-b ${
                        isDark ? "border-white/10" : "border-gray-200"
                      }`}
                    >
                      <p
                        className={`text-xs ${
                          isDark ? "text-slate-400" : "text-gray-500"
                        }`}
                      >
                        Logado como
                      </p>
                      <p
                        className={`text-sm font-medium truncate ${
                          isDark ? "text-slate-100" : "text-gray-900"
                        }`}
                      >
                        {user?.email || user?.name}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                          theme === "dark"
                            ? isDark
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-emerald-50 text-emerald-700"
                            : isDark
                              ? "text-slate-200 hover:bg-slate-800/80"
                              : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span>Modo escuro</span>
                        {theme === "dark" && <span>●</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                          theme === "light"
                            ? isDark
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-emerald-50 text-emerald-700"
                            : isDark
                              ? "text-slate-200 hover:bg-slate-800/80"
                              : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span>Modo claro</span>
                        {theme === "light" && <span>●</span>}
                      </button>
                      <Link
                        href="/dashboard/subscription"
                        className={`block px-4 py-2 text-sm ${
                          isDark
                            ? "text-slate-200 hover:bg-slate-800/80"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Gerenciar assinatura
                      </Link>
                    </div>
                    <div
                      className={`py-1 border-t ${
                        isDark ? "border-white/10" : "border-gray-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={logout}
                        className={`w-full px-4 py-2 text-left text-sm ${
                          isDark
                            ? "text-red-300 hover:bg-red-900/40"
                            : "text-red-600 hover:bg-red-50"
                        }`}
                      >
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
