"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { api } from "@/services/api";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const plans = [
  {
    id: "monthly",
    name: "Mensal",
    price: "R$ 29,90",
    period: "/mês",
    description: "Ideal para começar",
    popular: false,
  },
  {
    id: "semiannual",
    name: "Semestral",
    price: "R$ 149,90",
    period: "/semestre",
    description: "Economize 16%",
    popular: true,
    savings: "16%",
  },
  {
    id: "annual",
    name: "Anual",
    price: "R$ 249,90",
    period: "/ano",
    description: "Melhor custo-benefício",
    popular: false,
    savings: "30%",
  },
];

export default function SubscriptionModal({
  isOpen,
  onClose,
}: SubscriptionModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async (plan: "monthly" | "semiannual" | "annual") => {
    try {
      setLoading(plan);
      const response = await api.post<{ sessionId: string; url: string }>(
        "/subscriptions/checkout",
        {
          plan,
        }
      );

      const stripe = await stripePromise;
      if (stripe && response.url) {
        window.location.href = response.url;
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      alert(error.message || "Erro ao criar sessão de checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Escolha seu plano
                </h3>
                <p className="text-sm text-gray-500 mb-8">
                  Assine agora e tenha acesso completo a todas as
                  funcionalidades do FineixoApp
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative border-2 rounded-lg p-6 ${
                        plan.popular
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Mais Popular
                        </span>
                      )}
                      {plan.savings && (
                        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded">
                          Economize {plan.savings}
                        </span>
                      )}
                      <div className="text-center">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">
                          {plan.name}
                        </h4>
                        <div className="mb-4">
                          <span className="text-3xl font-bold text-gray-900">
                            {plan.price}
                          </span>
                          <span className="text-gray-600 ml-1">
                            {plan.period}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                          {plan.description}
                        </p>
                        <button
                          onClick={() =>
                            handleSubscribe(
                              plan.id as "monthly" | "semiannual" | "annual"
                            )
                          }
                          disabled={loading === plan.id}
                          className={`w-full py-2 px-4 rounded-md font-semibold ${
                            plan.popular
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {loading === plan.id ? "Processando..." : "Assinar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={onClose}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

