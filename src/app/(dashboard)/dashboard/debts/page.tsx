'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import MonthSelector from '@/components/MonthSelector';

interface Debt {
  _id: string;
  description: string;
  amount: number;
  type: 'single' | 'monthly' | 'installment';
  dueDate: string;
  paid: boolean;
  paidAt?: string;
  categoryId?: { name: string; color?: string };
  creditCardId?: { name: string };
  installments?: { current: number; total: number };
  totalPaid?: number; // Total já pago
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [creditCards, setCreditCards] = useState<Array<{ _id: string; name: string; bestPurchaseDay: number }>>([]);
  const [isCreditCardPurchase, setIsCreditCardPurchase] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'single' as 'single' | 'monthly' | 'installment',
    dueDate: '',
    purchaseDate: '',
    categoryId: '',
    creditCardId: '',
    accountId: '',
    installments: { current: '1', total: '1' },
    month: '',
    isTotalAmount: false, // Se o valor informado é total ou parcela
    installmentCount: '1', // Quantidade de parcelas
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payFormData, setPayFormData] = useState({
    amount: '',
    accountId: '',
    walletId: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [accounts, setAccounts] = useState<Array<{ _id: string; name: string }>>([]);
  const [wallets, setWallets] = useState<Array<{ _id: string; name: string }>>([]);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchDebts();
    fetchCategories();
    fetchCreditCards();
    fetchAccounts();
    fetchWallets();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await api.get<{ accounts: Array<{ _id: string; name: string }> }>('/accounts');
      setAccounts(data.accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchWallets = async () => {
    try {
      const data = await api.get<{ wallets: Array<{ _id: string; name: string }> }>('/wallets');
      setWallets(data.wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.get<{ categories: Array<{ _id: string; name: string }> }>('/categories');
      setCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCreditCards = async () => {
    try {
      const data = await api.get<{ creditCards: Array<{ _id: string; name: string; bestPurchaseDay: number }> }>('/credit-cards');
      setCreditCards(data.creditCards);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    }
  };

  const handlePayDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    const remaining = debt.totalPaid ? debt.amount - debt.totalPaid : debt.amount;
    setPayFormData({
      amount: remaining.toString(),
      accountId: '',
      walletId: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    setPaying(true);
    try {
      const payload: any = {
        amount: parseFloat(payFormData.amount),
        date: payFormData.date,
      };

      if (payFormData.accountId) {
        payload.accountId = payFormData.accountId;
      } else if (payFormData.walletId) {
        payload.walletId = payFormData.walletId;
      }
      // Se não especificar, a API usa carteira padrão

      await api.post(`/debts/${selectedDebt._id}/pay`, payload);

      setShowPayModal(false);
      setSelectedDebt(null);
      setPayFormData({
        amount: '',
        accountId: '',
        walletId: '',
        date: new Date().toISOString().split('T')[0],
      });
      fetchDebts();
    } catch (error: any) {
      alert(error.message || 'Erro ao processar pagamento');
    } finally {
      setPaying(false);
    }
  };

  const fetchDebts = async () => {
    try {
      const data = await api.get<{ debts: Debt[] }>('/debts');
      // Buscar total pago para cada dívida
      const debtsWithPayments = await Promise.all(
        data.debts.map(async (debt) => {
          try {
            const payments = await api.get<{ transactions: Array<{ amount: number }> }>(
              `/transactions?debtId=${debt._id}`
            );
            const totalPaid = payments.transactions.reduce((sum, t) => sum + t.amount, 0);
            return { ...debt, totalPaid };
          } catch {
            return { ...debt, totalPaid: 0 };
          }
        })
      );
      setDebts(debtsWithPayments);
    } catch (error) {
      console.error('Error fetching debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        type: formData.type,
      };

      // Se for cartão, usar purchaseDate e calcular dueDate; senão usar dueDate
      if (isCreditCardPurchase && formData.creditCardId) {
        if (formData.purchaseDate) {
          payload.purchaseDate = formData.purchaseDate;
          // Calcular dueDate baseado no dia de vencimento do cartão
          const purchaseDateObj = new Date(formData.purchaseDate);
          const creditCard = creditCards.find(c => c._id === formData.creditCardId);
          const dueDateObj = new Date(purchaseDateObj);
          dueDateObj.setMonth(dueDateObj.getMonth() + 1);
          // Ajustar para o dia de vencimento do cartão
          if (creditCard) {
            dueDateObj.setDate(creditCard.bestPurchaseDay);
          }
          payload.dueDate = dueDateObj.toISOString().split('T')[0];
        } else {
          payload.dueDate = formData.dueDate;
        }
      } else {
        payload.dueDate = formData.dueDate;
      }

      if (formData.categoryId) payload.categoryId = formData.categoryId;
      if (formData.creditCardId) payload.creditCardId = formData.creditCardId;
      if (formData.accountId) payload.accountId = formData.accountId;
      
      if (formData.type === 'installment') {
        payload.installmentCount = parseInt(formData.installmentCount);
        payload.isTotalAmount = formData.isTotalAmount;
        payload.installments = {
          current: parseInt(formData.installments.current),
          total: parseInt(formData.installmentCount),
        };
      }
      
      if (formData.type === 'monthly' && formData.month) {
        payload.month = formData.month;
      }

      const response = await api.post('/debts', payload);
      
      if (response.debts && response.debts.length > 1) {
        alert(`${response.debts.length} parcelas criadas com sucesso!`);
      }

      setShowModal(false);
      setIsCreditCardPurchase(false);
      setFormData({
        description: '',
        amount: '',
        type: 'single',
        dueDate: '',
        purchaseDate: '',
        categoryId: '',
        creditCardId: '',
        accountId: '',
        installments: { current: '1', total: '1' },
        month: '',
        isTotalAmount: false,
        installmentCount: '1',
      });
      fetchDebts();
    } catch (error: any) {
      alert(error.message || 'Erro ao criar dívida');
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

  const totalDebts = debts.filter((d) => !d.paid).reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dívidas</h1>
          <p className="mt-2 text-sm text-gray-600">
            Total não pago: {formatCurrency(totalDebts)}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Adicionar Dívida
        </button>
      </div>

      <MonthSelector value={currentMonth} onChange={setCurrentMonth} />

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {debts.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">
              Nenhuma dívida cadastrada ainda.
            </li>
          ) : (
            debts.map((debt) => (
              <li key={debt._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900">
                        {debt.description}
                      </h3>
                      {debt.categoryId && (
                        <span
                          className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: debt.categoryId.color
                              ? `${debt.categoryId.color}20`
                              : '#f3f4f6',
                            color: debt.categoryId.color || '#6b7280',
                          }}
                        >
                          {debt.categoryId.name}
                        </span>
                      )}
                      {debt.paid ? (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Pago Total
                        </span>
                      ) : debt.totalPaid && debt.totalPaid > 0 ? (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pago Parcial ({formatCurrency(debt.totalPaid)} / {formatCurrency(debt.amount)})
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <span>Vencimento: {formatDate(debt.dueDate)}</span>
                      {debt.creditCardId && (
                        <span className="ml-4">Cartão: {debt.creditCardId.name}</span>
                      )}
                      {debt.installments && (
                        <span className="ml-4">
                          Parcela {debt.installments.current}/{debt.installments.total}
                        </span>
                      )}
                      {debt.paidAt && (
                        <span className="ml-4">Pago em: {formatDate(debt.paidAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end space-y-2">
                    <div>
                      <span
                        className={`text-lg font-semibold ${
                          debt.paid ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(debt.amount)}
                      </span>
                      {debt.totalPaid && debt.totalPaid > 0 && !debt.paid && (
                        <p className="text-xs text-gray-500 mt-1">
                          Restante: {formatCurrency(debt.amount - debt.totalPaid)}
                        </p>
                      )}
                    </div>
                    {!debt.paid && (
                      <button
                        onClick={() => handlePayDebt(debt)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                      >
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Modal de Pagamento */}
      {showPayModal && selectedDebt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Pagar Dívida: {selectedDebt.description}
              </h3>
              <div className="text-sm text-gray-600 mb-4 space-y-1">
                <p>Valor total: {formatCurrency(selectedDebt.amount)}</p>
                {selectedDebt.totalPaid && selectedDebt.totalPaid > 0 && (
                  <p>
                    Já pago: {formatCurrency(selectedDebt.totalPaid)} | Restante:{' '}
                    {formatCurrency(selectedDebt.amount - selectedDebt.totalPaid)}
                  </p>
                )}
              </div>
              <form onSubmit={handlePaySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Valor a Pagar (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={
                      selectedDebt.totalPaid
                        ? selectedDebt.amount - selectedDebt.totalPaid
                        : selectedDebt.amount
                    }
                    required
                    value={payFormData.amount}
                    onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Você pode pagar parcial ou total. Máximo:{' '}
                    {formatCurrency(
                      selectedDebt.totalPaid
                        ? selectedDebt.amount - selectedDebt.totalPaid
                        : selectedDebt.amount
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pagar com
                  </label>
                  <select
                    value={
                      payFormData.accountId
                        ? `account-${payFormData.accountId}`
                        : payFormData.walletId
                        ? `wallet-${payFormData.walletId}`
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value.startsWith('account-')) {
                        setPayFormData({
                          ...payFormData,
                          accountId: e.target.value.replace('account-', ''),
                          walletId: '',
                        });
                      } else if (e.target.value.startsWith('wallet-')) {
                        setPayFormData({
                          ...payFormData,
                          walletId: e.target.value.replace('wallet-', ''),
                          accountId: '',
                        });
                      } else {
                        setPayFormData({ ...payFormData, accountId: '', walletId: '' });
                      }
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Carteira Principal (padrão)</option>
                    {wallets.map((wallet) => (
                      <option key={wallet._id} value={`wallet-${wallet._id}`}>
                        Carteira: {wallet.name}
                      </option>
                    ))}
                    {accounts.map((account) => (
                      <option key={account._id} value={`account-${account._id}`}>
                        Conta: {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    required
                    value={payFormData.date}
                    onChange={(e) => setPayFormData({ ...payFormData, date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPayModal(false);
                      setSelectedDebt(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={paying}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {paying ? 'Processando...' : 'Pagar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Dívida */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white m-4">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Adicionar Dívida
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="Ex: Compra no supermercado"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    É uma compra no cartão de crédito?
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isCreditCard"
                        checked={isCreditCardPurchase}
                        onChange={(e) => {
                          setIsCreditCardPurchase(true);
                        }}
                        className="mr-2"
                      />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isCreditCard"
                        checked={!isCreditCardPurchase}
                        onChange={(e) => {
                          setIsCreditCardPurchase(false);
                          setFormData({ ...formData, creditCardId: '', purchaseDate: '' });
                        }}
                        className="mr-2"
                      />
                      <span>Não</span>
                    </label>
                  </div>
                </div>
                {isCreditCardPurchase && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cartão de Crédito
                    </label>
                    <select
                      value={formData.creditCardId}
                      onChange={(e) => setFormData({ ...formData, creditCardId: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {creditCards.map((card) => (
                        <option key={card._id} value={card._id}>
                          {card.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {isCreditCardPurchase ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Data de Compra
                      </label>
                      <input
                        type="date"
                        required={isCreditCardPurchase}
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Data de Vencimento
                      </label>
                      <input
                        type="date"
                        required={!isCreditCardPurchase}
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="single">Unitária</option>
                    <option value="monthly">Mensal (Cartão)</option>
                    <option value="installment">Parcelada</option>
                  </select>
                </div>
                {formData.type === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Mês (YYYY-MM)
                    </label>
                    <input
                      type="month"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                )}
                {formData.type === 'installment' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantidade de Parcelas
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.installmentCount}
                        onChange={(e) => {
                          const count = e.target.value;
                          setFormData({
                            ...formData,
                            installmentCount: count,
                            installments: { ...formData.installments, total: count },
                          });
                        }}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        O valor informado corresponde a:
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={!formData.isTotalAmount}
                            onChange={(e) => setFormData({ ...formData, isTotalAmount: false })}
                            className="mr-2"
                          />
                          <span>Valor da Parcela</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={formData.isTotalAmount}
                            onChange={(e) => setFormData({ ...formData, isTotalAmount: true })}
                            className="mr-2"
                          />
                          <span>Valor Total</span>
                        </label>
                      </div>
                      {formData.isTotalAmount && formData.installmentCount && (
                        <p className="mt-2 text-sm text-gray-600">
                          Cada parcela será de:{' '}
                          {formatCurrency(parseFloat(formData.amount || '0') / parseInt(formData.installmentCount))}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Parcela Atual (para edição)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.installments.current}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            installments: { ...formData.installments, current: e.target.value },
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria (Opcional)
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setIsCreditCardPurchase(false);
                      setFormData({
                        description: '',
                        amount: '',
                        type: 'single',
                        dueDate: '',
                        purchaseDate: '',
                        categoryId: '',
                        creditCardId: '',
                        accountId: '',
                        installments: { current: '1', total: '1' },
                        month: '',
                        isTotalAmount: false,
                        installmentCount: '1',
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
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



