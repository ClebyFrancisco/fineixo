'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { formatCurrency, formatDate, getLocalDateString, getLocalMonthKey } from '@/lib/utils';
import MonthSelector from '@/components/MonthSelector';
import { useTheme } from '@/hooks/useTheme';

interface Account {
  _id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  bank: string;
}

interface Category {
  _id: string;
  name: string;
  color?: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => getLocalMonthKey());
  const [periodMode, setPeriodMode] = useState<'month' | 'range'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as 'checking' | 'savings' | 'investment',
    balance: '0',
    bank: '',
  });
  const [transactionFormData, setTransactionFormData] = useState({
    type: 'income' as 'income' | 'expense' | 'transfer' | 'adjustment',
    amount: '',
    description: '',
    categoryId: '',
    date: getLocalDateString(),
    transferToAccountId: '',
    newBalance: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittingTransaction, setSubmittingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    categoryId: '',
    date: '',
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await api.get<{ accounts: Account[] }>('/accounts');
      setAccounts(data.accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.get<{ categories: Category[] }>('/categories');
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAccountTransactions = async (
    accountId: string,
    mode: 'month' | 'range',
    month: string,
    rangeStart: string,
    rangeEnd: string,
  ) => {
    if (mode === 'range' && (!rangeStart || !rangeEnd)) return;

    try {
      let url: string;
      if (mode === 'range') {
        url = `/transactions?accountId=${accountId}&startDate=${rangeStart}&endDate=${rangeEnd}`;
      } else {
        url = `/transactions?accountId=${accountId}&month=${month}`;
      }

      const data = await api.get<{ transactions: any[] }>(url);
      const sorted = [...data.transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setTransactions(sorted);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleViewTransactions = (account: Account) => {
    setSelectedAccount(account);
    setShowTransactions(true);
    setPeriodMode('month');
    setStartDate('');
    setEndDate('');
    fetchAccountTransactions(account._id, 'month', currentMonth, '', '');
  };

  const handleAddTransaction = (account: Account) => {
    setSelectedAccount(account);
    setShowTransactionModal(true);
    setTransactionFormData({
      type: 'income',
      amount: '',
      description: '',
      categoryId: '',
      date: getLocalDateString(),
      transferToAccountId: '',
      newBalance: account.balance.toString(),
    });
  };

  const handleEditTransaction = (transaction: any) => {
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

  const handleEditTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !selectedAccount) return;

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
      await fetchAccounts();
      await fetchAccountTransactions(
        selectedAccount._id,
        periodMode,
        currentMonth,
        startDate,
        endDate,
      );
    } catch (error: any) {
      alert(error.message || 'Erro ao editar transação');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteTransaction = async (transaction: any) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    if (!selectedAccount) return;

    try {
      await api.delete(`/transactions/${transaction._id}`);
      await fetchAccounts();
      await fetchAccountTransactions(
        selectedAccount._id,
        periodMode,
        currentMonth,
        startDate,
        endDate,
      );
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir transação');
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setSubmittingTransaction(true);

    try {
      const month = transactionFormData.date.slice(0, 7);

      // Se for reajuste de saldo
      if (transactionFormData.type === 'adjustment') {
        if (!transactionFormData.newBalance) {
          alert('Informe o novo saldo para o reajuste');
          setSubmittingTransaction(false);
          return;
        }

        const newBalance = parseFloat(transactionFormData.newBalance);
        const currentBalance = selectedAccount.balance;
        const difference = newBalance - currentBalance;

        if (difference === 0) {
          alert('O novo saldo é igual ao saldo atual. Não há necessidade de reajuste.');
          setSubmittingTransaction(false);
          return;
        }

        const description = transactionFormData.description || 
          `Reajuste de Saldo: ${difference >= 0 ? '+' : ''}${formatCurrency(difference)}`;

        // Criar transação de ajuste
        await api.post('/transactions', {
          type: difference >= 0 ? 'income' : 'expense',
          amount: Math.abs(difference),
          description: description,
          categoryId: transactionFormData.categoryId || undefined,
          accountId: selectedAccount._id,
          date: transactionFormData.date,
          month: month,
        });

        // Atualizar saldo diretamente
        await api.put(`/accounts/${selectedAccount._id}`, {
          balance: newBalance,
        });
      }
      // Se for transferência, criar duas transações
      else if (transactionFormData.type === 'transfer') {
        if (!transactionFormData.transferToAccountId) {
          alert('Selecione a conta de destino para a transferência');
          setSubmittingTransaction(false);
          return;
        }

        if (transactionFormData.transferToAccountId === selectedAccount._id) {
          alert('A conta de destino deve ser diferente da conta de origem');
          setSubmittingTransaction(false);
          return;
        }

        const amount = parseFloat(transactionFormData.amount);
        const description = transactionFormData.description || 'Transferência entre contas';

        // Criar transação de saída na conta de origem
        await api.post('/transactions', {
          type: 'expense',
          amount: amount,
          description: `Transferência para: ${accounts.find(a => a._id === transactionFormData.transferToAccountId)?.name || 'Conta'}`,
          categoryId: transactionFormData.categoryId || undefined,
          accountId: selectedAccount._id,
          date: transactionFormData.date,
          month: month,
        });

        // Criar transação de entrada na conta de destino
        await api.post('/transactions', {
          type: 'income',
          amount: amount,
          description: `Transferência de: ${selectedAccount.name}`,
          categoryId: transactionFormData.categoryId || undefined,
          accountId: transactionFormData.transferToAccountId,
          date: transactionFormData.date,
          month: month,
        });
      } else {
        // Transação normal (entrada ou saída)
        await api.post('/transactions', {
          type: transactionFormData.type,
          amount: parseFloat(transactionFormData.amount),
          description: transactionFormData.description,
          categoryId: transactionFormData.categoryId || undefined,
          accountId: selectedAccount._id,
          date: transactionFormData.date,
          month: month,
        });
      }

      setShowTransactionModal(false);
      setTransactionFormData({
        type: 'income',
        amount: '',
        description: '',
        categoryId: '',
        date: getLocalDateString(),
        transferToAccountId: '',
        newBalance: selectedAccount?.balance.toString() || '0',
      });
      
      // Atualizar lista de contas para refletir o novo saldo
      await fetchAccounts();
      
      // Se estiver visualizando transações, atualizar também
      if (showTransactions) {
        await fetchAccountTransactions(
          selectedAccount._id,
          periodMode,
          currentMonth,
          startDate,
          endDate,
        );
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao criar transação');
    } finally {
      setSubmittingTransaction(false);
    }
  };

  useEffect(() => {
    if (showTransactions && selectedAccount) {
      fetchAccountTransactions(
        selectedAccount._id,
        periodMode,
        currentMonth,
        startDate,
        endDate,
      );
    }
  }, [currentMonth, periodMode, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/accounts', {
        name: formData.name,
        type: formData.type,
        balance: parseFloat(formData.balance),
        bank: formData.bank,
      });
      setShowModal(false);
      setFormData({ name: '', type: 'checking', balance: '0', bank: '' });
      fetchAccounts();
    } catch (error: any) {
      alert(error.message || 'Erro ao criar conta');
    } finally {
      setSubmitting(false);
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

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1
            className={`text-3xl font-bold ${
              isDark ? 'text-slate-100' : 'text-gray-900'
            }`}
          >
            Contas Bancárias
          </h1>
          <p
            className={`mt-2 text-sm ${
              isDark ? 'text-slate-300' : 'text-gray-600'
            }`}
          >
            Saldo Total:{" "}
            <span
              className={`font-semibold ${
                totalBalance >= 0
                  ? isDark
                    ? 'text-emerald-300'
                    : 'text-green-600'
                  : isDark
                  ? 'text-red-300'
                  : 'text-red-600'
              }`}
            >
              {formatCurrency(totalBalance)}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-cyan-500 text-slate-950 rounded-md hover:bg-cyan-400"
        >
          Adicionar Conta
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p
              className={`${
                isDark ? 'text-slate-300' : 'text-gray-500'
              }`}
            >
              Nenhuma conta cadastrada ainda.
            </p>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account._id}
              className={`shadow rounded-xl p-6 backdrop-blur ${
                isDark
                  ? 'bg-slate-900/80 border border-white/10'
                  : 'bg-white border border-gray-100'
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-2 ${
                  isDark ? 'text-slate-100' : 'text-gray-900'
                }`}
              >
                {account.name}
              </h3>
              <p
                className={`text-sm mb-4 ${
                  isDark ? 'text-slate-400' : 'text-gray-500'
                }`}
              >
                {account.bank}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span
                    className={`text-sm ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Tipo:
                  </span>
                  <span
                    className={`text-sm font-medium capitalize ${
                      isDark ? 'text-slate-50' : 'text-gray-900'
                    }`}
                  >
                    {account.type === 'checking'
                      ? 'Corrente'
                      : account.type === 'savings'
                      ? 'Poupança'
                      : 'Investimento'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span
                    className={`text-sm ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Saldo:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      account.balance >= 0
                        ? isDark
                          ? 'text-emerald-300'
                          : 'text-green-600'
                        : isDark
                        ? 'text-red-300'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(account.balance)}
                  </span>
                </div>
                <div
                  className={`mt-4 pt-4 space-y-2 border-t ${
                    isDark ? 'border-slate-800' : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => handleAddTransaction(account)}
                    className="w-full px-4 py-2 bg-emerald-500 text-slate-950 text-sm rounded-md hover:bg-emerald-400"
                  >
                    Adicionar Transação
                  </button>
                  <button
                    onClick={() => handleViewTransactions(account)}
                    className="w-full px-4 py-2 bg-cyan-500 text-slate-950 text-sm rounded-md hover:bg-cyan-400"
                  >
                    Ver Transações
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Transações da Conta */}
      {showTransactions && selectedAccount && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div
            className={`relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md m-4 ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3
                  className={`text-lg font-medium ${
                    isDark ? 'text-slate-100' : 'text-gray-900'
                  }`}
                >
                  Transações - {selectedAccount.name}
                </h3>
                <button
                  onClick={() => {
                    setShowTransactions(false);
                    setSelectedAccount(null);
                  }}
                  className={isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex rounded-lg overflow-hidden border border-slate-600">
                  <button
                    type="button"
                    onClick={() => setPeriodMode('month')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      periodMode === 'month'
                        ? 'bg-emerald-500 text-slate-950'
                        : isDark
                        ? 'bg-slate-900/70 text-slate-100 hover:bg-slate-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Por Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodMode('range')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      periodMode === 'range'
                        ? 'bg-emerald-500 text-slate-950'
                        : isDark
                        ? 'bg-slate-900/70 text-slate-100 hover:bg-slate-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      : 'bg-gray-50 border border-gray-200'
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
                      type="button"
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

              <div className={`shadow overflow-hidden sm:rounded-md max-h-96 overflow-y-auto ${
                isDark ? 'bg-slate-900/80' : 'bg-white'
              }`}>
                <ul className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-gray-200'}`}>
                  {transactions.length === 0 ? (
                    <li
                      className={`px-6 py-4 text-center ${
                        isDark ? 'text-slate-300' : 'text-gray-500'
                      }`}
                    >
                      Nenhuma transação neste mês.
                    </li>
                  ) : (
                    transactions.map((transaction) => (
                      <li key={transaction._id} className="px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              {transaction.description?.includes('Transferência') ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  Transferência
                                </span>
                              ) : transaction.description?.includes('Reajuste de Saldo') ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-800'
                                  }`}
                                >
                                  Reajuste de Saldo
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    transaction.type === 'income'
                                      ? isDark
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-green-100 text-green-800'
                                      : isDark
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {transaction.type === 'income' ? 'Entrada' : 'Saída'}
                                </span>
                              )}
                              {transaction.categoryId && !transaction.description?.includes('Transferência') && (
                                <span
                                  className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: transaction.categoryId.color
                                      ? `${transaction.categoryId.color}20`
                                      : isDark ? '#334155' : '#f3f4f6',
                                    color: transaction.categoryId.color || (isDark ? '#94a3b8' : '#6b7280'),
                                  }}
                                >
                                  {transaction.categoryId.name}
                                </span>
                              )}
                              {transaction.debtId && (
                                <span
                                  className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
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
                            <p
                              className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
                            >
                              {formatDate(transaction.date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`text-lg font-semibold ${
                                transaction.description?.includes('Reajuste de Saldo')
                                  ? isDark ? 'text-orange-400' : 'text-orange-600'
                                  : transaction.description?.includes('Transferência')
                                  ? isDark ? 'text-blue-400' : 'text-blue-600'
                                  : transaction.type === 'income'
                                  ? isDark ? 'text-emerald-300' : 'text-green-600'
                                  : isDark ? 'text-red-400' : 'text-red-600'
                              }`}
                            >
                              {transaction.description?.includes('Reajuste de Saldo')
                                ? (transaction.type === 'income' ? '+' : '-')
                                : transaction.description?.includes('Transferência')
                                ? ''
                                : transaction.type === 'income'
                                ? '+'
                                : '-'}
                              {formatCurrency(transaction.amount)}
                            </span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditTransaction(transaction)}
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
                                type="button"
                                onClick={() => handleDeleteTransaction(transaction)}
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
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Transação */}
      {showTransactionModal && selectedAccount && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Adicionar Transação - {selectedAccount.name}
              </h3>
              <form onSubmit={handleSubmitTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    value={transactionFormData.type}
                    onChange={(e) =>
                      setTransactionFormData({
                        ...transactionFormData,
                        type: e.target.value as 'income' | 'expense' | 'transfer' | 'adjustment',
                        transferToAccountId: e.target.value !== 'transfer' ? '' : transactionFormData.transferToAccountId,
                        newBalance: e.target.value === 'adjustment' && selectedAccount 
                          ? selectedAccount.balance.toString() 
                          : transactionFormData.newBalance,
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="income">Entrada</option>
                    <option value="expense">Saída</option>
                    <option value="transfer">Transferência entre Contas</option>
                    <option value="adjustment">Reajuste de Saldo</option>
                  </select>
                </div>
                {transactionFormData.type === 'transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Conta de Destino
                    </label>
                    <select
                      value={transactionFormData.transferToAccountId}
                      onChange={(e) =>
                        setTransactionFormData({
                          ...transactionFormData,
                          transferToAccountId: e.target.value,
                        })
                      }
                      required={transactionFormData.type === 'transfer'}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Selecione a conta de destino</option>
                      {accounts
                        .filter(acc => acc._id !== selectedAccount?._id)
                        .map((account) => (
                          <option key={account._id} value={account._id}>
                            {account.name} - {account.bank}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Conta de origem: <strong>{selectedAccount?.name}</strong>
                    </p>
                  </div>
                )}
                {transactionFormData.type === 'adjustment' && (
                  <div>
                    <div className="mb-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Saldo Atual:</strong> {formatCurrency(selectedAccount?.balance || 0)}
                      </p>
                    </div>
                    <label className="block text-sm font-medium text-gray-700">
                      Novo Saldo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={transactionFormData.newBalance}
                      onChange={(e) => {
                        const newBalance = e.target.value;
                        setTransactionFormData({
                          ...transactionFormData,
                          newBalance: newBalance,
                        });
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="0.00"
                    />
                    {transactionFormData.newBalance && selectedAccount && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          <strong>Diferença:</strong>{' '}
                          <span className={`text-lg font-bold ${
                            parseFloat(transactionFormData.newBalance) - (selectedAccount.balance || 0) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {parseFloat(transactionFormData.newBalance) - (selectedAccount.balance || 0) >= 0 ? '+' : ''}
                            {formatCurrency(parseFloat(transactionFormData.newBalance) - (selectedAccount.balance || 0))}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {transactionFormData.type !== 'adjustment' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={transactionFormData.amount}
                      onChange={(e) =>
                        setTransactionFormData({
                          ...transactionFormData,
                          amount: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="0.00"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Descrição {(transactionFormData.type === 'transfer' || transactionFormData.type === 'adjustment') && '(opcional)'}
                  </label>
                  <input
                    type="text"
                    required={transactionFormData.type !== 'transfer' && transactionFormData.type !== 'adjustment'}
                    value={transactionFormData.description}
                    onChange={(e) =>
                      setTransactionFormData({
                        ...transactionFormData,
                        description: e.target.value,
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder={
                      transactionFormData.type === 'transfer' 
                        ? 'Ex: Transferência mensal (opcional)' 
                        : transactionFormData.type === 'adjustment'
                        ? 'Ex: Ajuste por divergência (opcional)'
                        : 'Ex: Salário, Compras...'
                    }
                  />
                  {transactionFormData.type === 'transfer' && (
                    <p className="mt-1 text-xs text-gray-500">
                      Se não informar, será usado &quot;Transferência entre contas&quot;
                    </p>
                  )}
                  {transactionFormData.type === 'adjustment' && (
                    <p className="mt-1 text-xs text-gray-500">
                      Se não informar, será gerada automaticamente com base na diferença
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria (opcional)
                  </label>
                  <select
                    value={transactionFormData.categoryId}
                    onChange={(e) =>
                      setTransactionFormData({
                        ...transactionFormData,
                        categoryId: e.target.value,
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                  <label className="block text-sm font-medium text-gray-700">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={transactionFormData.date}
                    onChange={(e) =>
                      setTransactionFormData({
                        ...transactionFormData,
                        date: e.target.value,
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransactionModal(false);
                      setSelectedAccount(null);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTransaction}
                    className={`flex-1 px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                      transactionFormData.type === 'adjustment'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : transactionFormData.type === 'transfer'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : transactionFormData.type === 'income'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {submittingTransaction 
                      ? 'Salvando...' 
                      : transactionFormData.type === 'transfer' 
                        ? 'Transferir' 
                        : transactionFormData.type === 'adjustment'
                        ? 'Aplicar Reajuste'
                        : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
            <form onSubmit={handleEditTransactionSubmit} className="space-y-4">
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

      {/* Modal de Adicionar Conta */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Adicionar Conta Bancária
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome da Conta
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: Conta Corrente Principal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Banco
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: Banco do Brasil, Itaú..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({ name: '', type: 'checking', balance: '0', bank: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
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



