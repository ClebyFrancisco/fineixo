'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import MonthSelector from '@/components/MonthSelector';

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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as 'checking' | 'savings' | 'investment',
    balance: '0',
    bank: '',
  });
  const [transactionFormData, setTransactionFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittingTransaction, setSubmittingTransaction] = useState(false);

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

  const fetchAccountTransactions = async (accountId: string) => {
    try {
      const data = await api.get<{ transactions: any[] }>(
        `/transactions?accountId=${accountId}&month=${currentMonth}`
      );
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleViewTransactions = (account: Account) => {
    setSelectedAccount(account);
    setShowTransactions(true);
    fetchAccountTransactions(account._id);
  };

  const handleAddTransaction = (account: Account) => {
    setSelectedAccount(account);
    setShowTransactionModal(true);
    setTransactionFormData({
      type: 'income',
      amount: '',
      description: '',
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setSubmittingTransaction(true);

    try {
      const now = new Date(transactionFormData.date);
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await api.post('/transactions', {
        type: transactionFormData.type,
        amount: parseFloat(transactionFormData.amount),
        description: transactionFormData.description,
        categoryId: transactionFormData.categoryId || undefined,
        accountId: selectedAccount._id,
        date: transactionFormData.date,
        month: month,
      });

      setShowTransactionModal(false);
      setTransactionFormData({
        type: 'income',
        amount: '',
        description: '',
        categoryId: '',
        date: new Date().toISOString().split('T')[0],
      });
      
      // Atualizar lista de contas para refletir o novo saldo
      await fetchAccounts();
      
      // Se estiver visualizando transações, atualizar também
      if (showTransactions) {
        await fetchAccountTransactions(selectedAccount._id);
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao criar transação');
    } finally {
      setSubmittingTransaction(false);
    }
  };

  useEffect(() => {
    if (showTransactions && selectedAccount) {
      fetchAccountTransactions(selectedAccount._id);
    }
  }, [currentMonth]);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="mt-2 text-sm text-gray-600">
            Saldo Total: {formatCurrency(totalBalance)}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Adicionar Conta
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">Nenhuma conta cadastrada ainda.</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account._id} className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {account.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4">{account.bank}</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Tipo:</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {account.type === 'checking'
                      ? 'Corrente'
                      : account.type === 'savings'
                      ? 'Poupança'
                      : 'Investimento'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Saldo:</span>
                  <span
                    className={`text-sm font-medium ${
                      account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(account.balance)}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t space-y-2">
                  <button
                    onClick={() => handleAddTransaction(account)}
                    className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    Adicionar Transação
                  </button>
                  <button
                    onClick={() => handleViewTransactions(account)}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
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
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white m-4">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Transações - {selectedAccount.name}
                </h3>
                <button
                  onClick={() => {
                    setShowTransactions(false);
                    setSelectedAccount(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <MonthSelector value={currentMonth} onChange={setCurrentMonth} />

              <div className="bg-white shadow overflow-hidden sm:rounded-md max-h-96 overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                  {transactions.length === 0 ? (
                    <li className="px-6 py-4 text-center text-gray-500">
                      Nenhuma transação neste mês.
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
                                    ? 'bg-green-100 text-green-800'
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
                            <p className="mt-1 text-sm text-gray-900">{transaction.description}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(transaction.date)}
                            </p>
                          </div>
                          <div className="ml-4">
                            <span
                              className={`text-lg font-semibold ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
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
                        type: e.target.value as 'income' | 'expense',
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="income">Entrada</option>
                    <option value="expense">Saída</option>
                  </select>
                </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionFormData.description}
                    onChange={(e) =>
                      setTransactionFormData({
                        ...transactionFormData,
                        description: e.target.value,
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ex: Salário, Compras..."
                  />
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
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTransaction}
                    className={`flex-1 px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                      transactionFormData.type === 'income'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {submittingTransaction ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
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
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
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



