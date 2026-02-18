'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import MonthSelector from '@/components/MonthSelector';
import { useTheme } from '@/hooks/useTheme';

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryId?: { name: string; color?: string };
  accountId?: { name: string; bank?: string };
  walletId?: { name: string };
  creditCardId?: { name: string };
  debtId?: { description: string; amount: number };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filter, setFilter] = useState<'all' | 'account' | 'card' | 'wallet'>('all');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCard, setSelectedCard] = useState('');
  const [accounts, setAccounts] = useState<Array<{ _id: string; name: string }>>([]);
  const [creditCards, setCreditCards] = useState<Array<{ _id: string; name: string }>>([]);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchCreditCards();
  }, [currentMonth, filter, selectedAccount, selectedCard]);

  const fetchAccounts = async () => {
    try {
      const data = await api.get<{ accounts: Array<{ _id: string; name: string }> }>('/accounts');
      setAccounts(data.accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchCreditCards = async () => {
    try {
      const data = await api.get<{ creditCards: Array<{ _id: string; name: string }> }>('/credit-cards');
      setCreditCards(data.creditCards);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let url = `/transactions?month=${currentMonth}`;

      if (filter === 'account' && selectedAccount) {
        url += `&accountId=${selectedAccount}`;
      } else if (filter === 'card' && selectedCard) {
        url += `&creditCardId=${selectedCard}`;
      } else if (filter === 'wallet') {
        url += `&walletId=wallet`;
      }

      const data = await api.get<{ transactions: Transaction[] }>(url);
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
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

      <MonthSelector value={currentMonth} onChange={setCurrentMonth} />

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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
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
                  <div className="ml-4">
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
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

















