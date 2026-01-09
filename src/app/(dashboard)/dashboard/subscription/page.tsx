'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';

interface Subscription {
  id: string;
  status: string;
  plan: 'monthly' | 'semiannual' | 'annual';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
}

interface HistoryItem {
  _id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  createdAt: string;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSubscription, subscription: authSubscription } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchHistory();

    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      alert('Assinatura criada com sucesso!');
      refreshSubscription();
      router.replace('/dashboard/subscription');
    }

    if (canceled === 'true') {
      alert('Assinatura cancelada');
      router.replace('/dashboard/subscription');
    }
  }, [searchParams, router, refreshSubscription]);

  const fetchSubscription = async () => {
    try {
      const data = await api.get<{
        hasSubscription: boolean;
        isActive: boolean;
        subscription: Subscription | null;
      }>('/subscriptions/status');
      setSubscription(data.subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await api.get<{ history: HistoryItem[] }>('/subscriptions/history');
      setHistory(data.history);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Ela será cancelada ao final do período atual.')) {
      return;
    }

    try {
      setCanceling(true);
      await api.post('/subscriptions/manage', { action: 'cancel' });
      alert('Assinatura será cancelada ao final do período atual');
      await fetchSubscription();
      await refreshSubscription();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      alert(error.message || 'Erro ao cancelar assinatura');
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setReactivating(true);
      await api.post('/subscriptions/manage', { action: 'reactivate' });
      alert('Assinatura reativada com sucesso!');
      await fetchSubscription();
      await refreshSubscription();
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      alert(error.message || 'Erro ao reativar assinatura');
    } finally {
      setReactivating(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setOpeningPortal(true);
      const data = await api.get<{ url: string }>('/subscriptions/manage');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error opening portal:', error);
      alert(error.message || 'Erro ao abrir portal de gerenciamento');
    } finally {
      setOpeningPortal(false);
    }
  };

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      monthly: 'Mensal',
      semiannual: 'Semestral',
      annual: 'Anual',
    };
    return names[plan] || plan;
  };

  const getStatusName = (status: string) => {
    const names: Record<string, string> = {
      active: 'Ativa',
      canceled: 'Cancelada',
      past_due: 'Pagamento Atrasado',
      unpaid: 'Não Pago',
      trialing: 'Período de Teste',
      incomplete: 'Incompleta',
      incomplete_expired: 'Incompleta Expirada',
    };
    return names[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Assinatura</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gerencie sua assinatura e visualize o histórico de pagamentos
        </p>
      </div>

      {subscription ? (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assinatura Atual</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Plano</p>
              <p className="text-lg font-medium text-gray-900">{getPlanName(subscription.plan)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className={`text-lg font-medium ${
                subscription.status === 'active' ? 'text-green-600' : 'text-red-600'
              }`}>
                {getStatusName(subscription.status)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Início do Período</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(subscription.currentPeriodStart).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fim do Período</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {canceling ? 'Cancelando...' : 'Cancelar Assinatura'}
              </button>
            )}
            
            {subscription.status === 'active' && subscription.cancelAtPeriodEnd && (
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {reactivating ? 'Reativando...' : 'Reativar Assinatura'}
              </button>
            )}

            <button
              onClick={handleOpenPortal}
              disabled={openingPortal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {openingPortal ? 'Abrindo...' : 'Gerenciar no Portal Stripe'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <p className="text-yellow-800">
            Você não possui uma assinatura ativa. Assine um plano para ter acesso completo às funcionalidades.
          </p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Histórico de Pagamentos</h2>
        
        {history.length === 0 ? (
          <p className="text-gray-500">Nenhum histórico disponível</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPlanName(item.plan)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full ${
                        item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {getStatusName(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.amount / 100)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



