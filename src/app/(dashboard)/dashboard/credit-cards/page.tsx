'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';

interface CreditCard {
  _id: string;
  name: string;
  limit: number;
  availableLimit: number;
  bestPurchaseDay: number;
  dueDate?: number; // Pode não existir em cartões antigos
}

export default function CreditCardsPage() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<CreditCard | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    limit: '',
    bestPurchaseDay: '1',
    dueDate: '10',
    accountId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchCreditCards();
  }, []);

  const fetchCreditCards = async () => {
    try {
      const data = await api.get<{ creditCards: CreditCard[] }>('/credit-cards');
      // Manter os valores originais, sem sobrescrever dueDate
      setCreditCards(data.creditCards);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Garantir que dueDate seja sempre enviado como número
      const dueDateValue = parseInt(formData.dueDate, 10);
      const bestPurchaseDayValue = parseInt(formData.bestPurchaseDay, 10);
      
      await api.post('/credit-cards', {
        name: formData.name,
        limit: parseFloat(formData.limit),
        bestPurchaseDay: bestPurchaseDayValue,
        dueDate: dueDateValue, // Sempre enviar o valor exato informado pelo usuário
        accountId: formData.accountId || undefined,
      });
      setShowModal(false);
      setFormData({ name: '', limit: '', bestPurchaseDay: '1', dueDate: '10', accountId: '' });
      fetchCreditCards();
    } catch (error: any) {
      alert(error.message || 'Erro ao criar cartão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card);
    // Garantir que dueDate sempre tenha um valor válido
    // Se não existir, usar o valor padrão do modelo (10) ou bestPurchaseDay como fallback
    const dueDateValue = card.dueDate !== undefined && card.dueDate !== null 
      ? card.dueDate 
      : (card.bestPurchaseDay || 10);
    
    setFormData({
      name: card.name,
      limit: card.limit.toString(),
      bestPurchaseDay: card.bestPurchaseDay.toString(),
      dueDate: dueDateValue.toString(),
      accountId: '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    setSubmittingEdit(true);
    try {
      // Garantir que dueDate seja sempre enviado como número
      const dueDateValue = parseInt(formData.dueDate, 10);
      const bestPurchaseDayValue = parseInt(formData.bestPurchaseDay, 10);
      
      const updateData: any = {
        name: formData.name,
        limit: parseFloat(formData.limit),
        bestPurchaseDay: bestPurchaseDayValue,
        dueDate: dueDateValue, // Sempre enviar o valor exato informado pelo usuário
      };
      
      if (formData.accountId) {
        updateData.accountId = formData.accountId;
      }
      
      await api.put(`/credit-cards/${editingCard._id}`, updateData);
      setShowEditModal(false);
      setEditingCard(null);
      setFormData({ name: '', limit: '', bestPurchaseDay: '1', dueDate: '10', accountId: '' });
      await fetchCreditCards();
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar cartão');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteClick = (card: CreditCard) => {
    setDeletingCard(card);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCard) return;

    try {
      await api.delete(`/credit-cards/${deletingCard._id}`);
      setShowDeleteModal(false);
      setDeletingCard(null);
      fetchCreditCards();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir cartão');
    }
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900'
            : 'bg-gray-50'
        }`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1
            className={`text-3xl font-bold ${
              isDark ? 'text-slate-100' : 'text-gray-900'
            }`}
          >
            Cartões de Crédito
          </h1>
          <p
            className={`mt-2 text-sm ${
              isDark ? 'text-slate-300' : 'text-gray-600'
            }`}
          >
            Gerencie seus cartões de crédito
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-md hover:bg-emerald-400"
        >
          Adicionar Cartão
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {creditCards.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p
              className={`${
                isDark ? 'text-slate-300' : 'text-gray-500'
              }`}
            >
              Nenhum cartão cadastrado ainda.
            </p>
          </div>
        ) : (
          creditCards.map((card) => (
            <div
              key={card._id}
              className={`shadow rounded-xl p-6 relative ${
                isDark
                  ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
                  : 'bg-white border border-gray-100'
              }`}
            >
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  onClick={() => handleEdit(card)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Editar cartão"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteClick(card)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Excluir cartão"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
              <h3
                className={`text-lg font-semibold mb-4 pr-16 ${
                  isDark ? 'text-slate-100' : 'text-gray-900'
                }`}
              >
                {card.name}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span
                    className={`text-sm ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Limite Total:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-slate-50' : 'text-gray-900'
                    }`}
                  >
                    {formatCurrency(card.limit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={`text-sm ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Disponível:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-emerald-300' : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(card.availableLimit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={`text-sm ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Melhor Dia:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-slate-50' : 'text-gray-900'
                    }`}
                  >
                    Dia {card.bestPurchaseDay}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={`text-sm ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Vencimento:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-slate-50' : 'text-gray-900'
                    }`}
                  >
                    Dia {card.dueDate !== undefined && card.dueDate !== null ? card.dueDate : (card.bestPurchaseDay || 10)}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div
                    className={`w-full rounded-full h-2 ${
                      isDark ? 'bg-slate-800' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className="bg-emerald-400 h-2 rounded-full"
                      style={{
                        width: `${(card.availableLimit / card.limit) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href={`/dashboard/credit-cards/${card._id}/invoices`}
                    className="block w-full text-center px-4 py-2 bg-emerald-500 text-slate-950 rounded-md hover:bg-emerald-400 transition-colors"
                  >
                    Ver Faturas
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && deletingCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
                Excluir Cartão
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 text-center mb-3">
                  Tem certeza que deseja excluir o cartão <strong>{deletingCard.name}</strong>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800 font-medium mb-1">
                    ⚠️ Atenção: Esta ação não pode ser desfeita!
                  </p>
                  <p className="text-xs text-red-700">
                    Todos os dados associados ao cartão serão excluídos, incluindo:
                  </p>
                  <ul className="text-xs text-red-700 mt-2 list-disc list-inside space-y-1">
                    <li>Todas as compras e faturas</li>
                    <li>Todos os reajustes de fatura</li>
                    <li>Histórico de transações relacionadas</li>
                  </ul>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingCard(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Excluir Cartão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Cartão */}
      {showEditModal && editingCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Editar Cartão de Crédito
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome do Cartão
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Nubank, Itaú..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Limite (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.limit}
                    onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Melhor Dia de Compra (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.bestPurchaseDay}
                    onChange={(e) => setFormData({ ...formData, bestPurchaseDay: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Dia ideal para fazer compras e ter mais tempo para pagar
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dia de Vencimento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Dia em que a fatura vence
                  </p>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCard(null);
                      setFormData({ name: '', limit: '', bestPurchaseDay: '1', dueDate: '10', accountId: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingEdit ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Cartão */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Adicionar Cartão de Crédito
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome do Cartão
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Nubank, Itaú..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Limite (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.limit}
                    onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Melhor Dia de Compra (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.bestPurchaseDay}
                    onChange={(e) => setFormData({ ...formData, bestPurchaseDay: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Dia ideal para fazer compras e ter mais tempo para pagar
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dia de Vencimento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Dia em que a fatura vence
                  </p>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({ name: '', limit: '', bestPurchaseDay: '1', dueDate: '10', accountId: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



