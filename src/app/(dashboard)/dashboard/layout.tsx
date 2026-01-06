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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SubscriptionBanner />
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Fineixo</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className={`${
                    pathname === "/dashboard"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/credit-cards"
                  className={`${
                    pathname === "/dashboard/credit-cards"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Cartões
                </Link>
                <Link
                  href="/dashboard/debts"
                  className={`${
                    pathname === "/dashboard/debts"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Dívidas
                </Link>
                <Link
                  href="/dashboard/categories"
                  className={`${
                    pathname === "/dashboard/categories"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Categorias
                </Link>
                <Link
                  href="/dashboard/accounts"
                  className={`${
                    pathname === "/dashboard/accounts"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Contas
                </Link>
                <Link
                  href="/dashboard/wallet"
                  className={`${
                    pathname === "/dashboard/wallet"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Carteira
                </Link>
                <Link
                  href="/dashboard/transactions"
                  className={`${
                    pathname === "/dashboard/transactions"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Transações
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/subscription"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Assinatura
              </Link>
              <span className="text-sm text-gray-700">{user?.name}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
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
