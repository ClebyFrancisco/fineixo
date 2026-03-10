'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { formatCurrency, formatDate, getLocalMonthKey } from '@/lib/utils';
import MonthSelector from '@/components/MonthSelector';
import { useTheme } from '@/hooks/useTheme';
import { useFinanceData } from '@/hooks/useFinanceData';

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryId?: { _id?: string; name: string; color?: string };
  accountId?: { name: string; bank?: string };
  walletId?: { name: string };
  creditCardId?: { name: string };
  debtId?: { description: string; amount: number };
}

interface Category {
  _id: string;
  name: string;
  color?: string;
}

export default function TransactionsPage() {
  const {
    accounts: contextAccounts,
    creditCards: contextCreditCards,
    loadAccounts,
    loadCreditCards,
  } = useFinanceData();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => getLocalMonthKey());
  const [filter, setFilter] = useState<'all' | 'account' | 'card' | 'wallet'>('all');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCard, setSelectedCard] = useState('');
  const [periodMode, setPeriodMode] = useState<'month' | 'range'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    categoryId: '',
    date: '',
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const txInflightRef = useRef<AbortController | null>(null);

  const accounts = contextAccounts;
  const creditCards = contextCreditCards;

  useEffect(() => {
    loadAccounts();
    loadCreditCards();
  }, [loadAccounts, loadCreditCards]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get<{ categories: Category[] }>('/categories');
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    const dateStr = new Date(transaction.date).toISOString().slice(0, 10);
    setEditFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      categoryId: transaction.categoryId?._id || '',
      date: dateStr,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    setSubmittingEdit(true);
    try {
      await api.put(`/transactions/${editingTransaction._id}`, {
        type: editFormData.type,
        amount: parseFloat(editFormData.amount),
        description: editFormData.description,
        categoryId: editFormData.categoryId || undefined,
        date: editFormData.date,
      });
      setEditingTransaction(null);
      fetchTransactions(currentMonth, filter, selectedAccount, selectedCard, periodMode, startDate, endDate);
    } catch (error: unknown) {
      const err = error as { message?: string };
      alert(err.message || 'Erro ao editar transação');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      await api.delete(`/transactions/${transaction._id}`);
      fetchTransactions(currentMonth, filter, selectedAccount, selectedCard, periodMode, startDate, endDate);
    } catch (error: unknown) {
      const err = error as { message?: string };
      alert(err.message || 'Erro ao excluir transação');
    }
  };

  const fetchTransactions = useCallback(async (
    month: string,
    filterType: string,
    accountId: string,
    cardId: string,
    mode: 'month' | 'range',
    rangeStart: string,
    rangeEnd: string,
  ) => {
    if (mode === 'range' && (!rangeStart || !rangeEnd)) return;

    txInflightRef.current?.abort();
    const controller = new AbortController();
    txInflightRef.current = controller;

    setLoading(true);
    try {
      let url: string;
      if (mode === 'range') {
        url = `/transactions?startDate=${rangeStart}&endDate=${rangeEnd}`;
      } else {
        url = `/transactions?month=${month}`;
      }

      if (filterType === 'account' && accountId) {
        url += `&accountId=${accountId}`;
      } else if (filterType === 'card' && cardId) {
        url += `&creditCardId=${cardId}`;
      } else if (filterType === 'wallet') {
        url += `&walletId=wallet`;
      }

      const data = await api.get<{ transactions: Transaction[] }>(url);
      if (!controller.signal.aborted) {
        const sorted = [...data.transactions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setTransactions(sorted);
        setInitialLoad(false);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Error fetching transactions:', error);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTransactions(currentMonth, filter, selectedAccount, selectedCard, periodMode, startDate, endDate);
  }, [currentMonth, filter, selectedAccount, selectedCard, periodMode, startDate, endDate, fetchTransactions]);

  if (initialLoad && loading) {
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

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1
          className={`text-3xl font-bold ${
            isDark ? 'text-slate-100' : 'text-gray-900'
          }`}
        >
          Transações
        </h1>
        <p
          className={`mt-2 text-sm ${
            isDark ? 'text-slate-300' : 'text-gray-600'
          }`}
        >
          Visualize todas as suas transações financeiras
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-slate-600">
          <button
            onClick={() => setPeriodMode('month')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              periodMode === 'month'
                ? 'bg-emerald-500 text-slate-950'
                : isDark
                ? 'bg-slate-900/70 text-slate-100 hover:bg-slate-800'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Por Mês
          </button>
          <button
            onClick={() => setPeriodMode('range')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              periodMode === 'range'
                ? 'bg-emerald-500 text-slate-950'
                : isDark
                ? 'bg-slate-900/70 text-slate-100 hover:bg-slate-800'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Por Período
          </button>
        </div>
      </div>

      {periodMode === 'month' ? (
        <MonthSelector value={currentMonth} onChange={setCurrentMonth} />
      ) : (
        <div
          className={`flex flex-wrap items-end gap-4 mb-6 p-4 rounded-xl ${
            isDark
              ? 'bg-slate-900/80 border border-white/10'
              : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex flex-col">
            <label
              className={`text-xs font-medium mb-1 ${
                isDark ? 'text-slate-300' : 'text-gray-600'
              }`}
            >
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
                isDark
                  ? 'border-slate-600 bg-slate-900/70 text-slate-100'
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            />
          </div>
          <div className="flex flex-col">
            <label
              className={`text-xs font-medium mb-1 ${
                isDark ? 'text-slate-300' : 'text-gray-600'
              }`}
            >
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
                isDark
                  ? 'border-slate-600 bg-slate-900/70 text-slate-100'
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            />
          </div>
          {startDate && endDate && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                isDark
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Limpar
            </button>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <label
            className={`text-sm font-medium ${
              isDark ? 'text-slate-200' : 'text-gray-700'
            }`}
          >
            Filtro:
          </label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as any);
              setSelectedAccount('');
              setSelectedCard('');
            }}
            className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
              isDark
                ? 'border-slate-600 bg-slate-900/70 text-slate-100'
                : 'border-gray-300 bg-white text-gray-900'
            }`}
          >
            <option value="all">Todas</option>
            <option value="account">Por Conta</option>
            <option value="card">Por Cartão</option>
            <option value="wallet">Carteira</option>
          </select>
        </div>

        {filter === 'account' && (
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
              isDark
                ? 'border-slate-600 bg-slate-900/70 text-slate-100'
                : 'border-gray-300 bg-white text-gray-900'
            }`}
          >
            <option value="">Selecione uma conta</option>
            {accounts.map((acc) => (
              <option key={acc._id} value={acc._id}>
                {acc.name}
              </option>
            ))}
          </select>
        )}

        {filter === 'card' && (
          <select
            value={selectedCard}
            onChange={(e) => setSelectedCard(e.target.value)}
            className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
              isDark
                ? 'border-slate-600 bg-slate-900/70 text-slate-100'
                : 'border-gray-300 bg-white text-gray-900'
            }`}
          >
            <option value="">Selecione um cartão</option>
            {creditCards.map((card) => (
              <option key={card._id} value={card._id}>
                {card.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
        <div
          className={`shadow rounded-xl p-6 ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
              : 'bg-white border border-gray-100'
          }`}
        >
          <h3
            className={`text-sm font-medium ${
              isDark ? 'text-slate-300' : 'text-gray-500'
            }`}
          >
            Total de Entradas
          </h3>
          <p className="text-2xl font-bold text-emerald-300 mt-2">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div
          className={`shadow rounded-xl p-6 ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
              : 'bg-white border border-gray-100'
          }`}
        >
          <h3
            className={`text-sm font-medium ${
              isDark ? 'text-slate-300' : 'text-gray-500'
            }`}
          >
            Total de Saídas
          </h3>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div
          className={`shadow rounded-xl p-6 ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
              : 'bg-white border border-gray-100'
          }`}
        >
          <h3
            className={`text-sm font-medium ${
              isDark ? 'text-slate-300' : 'text-gray-500'
            }`}
          >
            Saldo do Período
          </h3>
          <p
            className={`text-2xl font-bold mt-2 ${
              totalIncome - totalExpense >= 0
                ? 'text-emerald-300'
                : 'text-red-600'
            }`}
          >
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      <div
        className={`shadow overflow-hidden sm:rounded-xl ${
          isDark
            ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
            : 'bg-white border border-gray-200'
        }`}
      >
        <ul
          className={`divide-y ${
            isDark ? 'divide-slate-800' : 'divide-gray-200'
          }`}
        >
          {transactions.length === 0 ? (
            <li
              className={`px-6 py-4 text-center ${
                isDark ? 'text-slate-300' : 'text-gray-500'
              }`}
            >
              Nenhuma transação encontrada.
            </li>
          ) : (
            transactions.map((transaction) => (
              <li key={transaction._id} className="px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'income'
                            ? isDark
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-green-100 text-green-800'
                            : isDark
                            ? 'bg-red-500/10 text-red-300'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                      {transaction.categoryId && (
                        <span
                          className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: transaction.categoryId.color
                              ? `${transaction.categoryId.color}20`
                              : '#f3f4f6',
                            color: transaction.categoryId.color || '#6b7280',
                          }}
                        >
                          {transaction.categoryId.name}
                        </span>
                      )}
                      {transaction.debtId && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pagamento de Dívida
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 text-sm ${
                        isDark ? 'text-slate-100' : 'text-gray-900'
                      }`}
                    >
                      {transaction.description}
                    </p>
                    <div
                      className={`mt-1 text-xs flex items-center space-x-2 ${
                        isDark ? 'text-slate-400' : 'text-gray-500'
                      }`}
                    >
                      <span>{formatDate(transaction.date)}</span>
                      {transaction.accountId && (
                        <span>• Conta: {transaction.accountId.name}</span>
                      )}
                      {transaction.walletId && (
                        <span>• Carteira: {transaction.walletId.name}</span>
                      )}
                      {transaction.creditCardId && (
                        <span>• Cartão: {transaction.creditCardId.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-lg font-semibold ${
                        transaction.type === 'income'
                          ? isDark
                            ? 'text-emerald-300'
                            : 'text-green-600'
                          : isDark
                          ? 'text-red-300'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className={`p-2 rounded-md transition-colors ${
                          isDark
                            ? 'text-slate-400 hover:bg-slate-800 hover:text-emerald-400'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-emerald-600'
                        }`}
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(transaction)}
                        className={`p-2 rounded-md transition-colors ${
                          isDark
                            ? 'text-slate-400 hover:bg-slate-800 hover:text-red-400'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-red-600'
                        }`}
                        title="Excluir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Modal de Editar Transação */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div
            className={`relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md m-4 ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
            }`}
          >
            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              Editar Transação
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Tipo
                </label>
                <select
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as 'income' | 'expense' })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
                    isDark ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-gray-300 bg-white text-gray-900'
                  }`}
                >
                  <option value="income">Entrada</option>
                  <option value="expense">Saída</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
                    isDark ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
                    isDark ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="Ex: Salário, Compras..."
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Categoria (opcional)
                </label>
                <select
                  value={editFormData.categoryId}
                  onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
                    isDark ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-gray-300 bg-white text-gray-900'
                  }`}
                >
                  <option value="">Nenhuma categoria</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
                    isDark ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-gray-300 bg-white text-gray-900'
                  }`}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className={`flex-1 px-4 py-2 rounded-md ${
                    isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-slate-950 rounded-md hover:bg-emerald-400 disabled:opacity-50"
                >
                  {submittingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

















