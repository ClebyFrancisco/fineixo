'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import MonthSelector from '@/components/MonthSelector';

interface CreditCard {
  _id: string;
  name: string;
  limit: number;
  availableLimit: number;
  bestPurchaseDay: number;
  dueDate?: number;
}

interface Invoice {
  _id: string;
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidAt?: string;
  categoryId?: { _id?: string; name: string; color?: string };
  month?: string;
  installments?: { current: number; total: number };
  totalPaid?: number; // Total já pago
}

interface Category {
  _id: string;
  name: string;
}

export default function CreditCardInvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;

  const [creditCard, setCreditCard] = useState<CreditCard | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'edit' | 'delete' | null>(null);
  const [confirmInvoice, setConfirmInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editAllParcels, setEditAllParcels] = useState(false);
  const [editFormData, setEditFormData] = useState({
    description: '',
    amount: '',
    dueDate: '',
    categoryId: '',
  });
  const [addFormData, setAddFormData] = useState({
    description: '',
    amount: '',
    purchaseDate: '',
    categoryId: '',
    type: 'single' as 'single' | 'monthly' | 'installment',
    installmentCount: '1',
    isTotalAmount: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [adjustmentFormData, setAdjustmentFormData] = useState({
    newTotalAmount: '',
    description: '',
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFormData, setPayFormData] = useState({
    amount: '',
    payTotal: false,
    accountId: '',
    walletId: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [accounts, setAccounts] = useState<Array<{ _id: string; name: string }>>([]);
  const [wallets, setWallets] = useState<Array<{ _id: string; name: string }>>([]);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchCreditCard();
    fetchCategories();
    fetchAccounts();
    fetchWallets();
  }, [cardId]);

  useEffect(() => {
    if (cardId) {
      fetchInvoices();
    }
  }, [cardId, currentMonth]);

  const fetchCreditCard = async () => {
    try {
      const data = await api.get<{ creditCard: CreditCard }>(`/credit-cards/${cardId}`);
      setCreditCard(data.creditCard);
    } catch (error) {
      console.error('Error fetching credit card:', error);
      alert('Erro ao carregar dados do cartão');
      router.push('/dashboard/credit-cards');
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ debts: Invoice[] }>(
        `/debts?creditCardId=${cardId}&month=${currentMonth}`
      );
      // Buscar total pago para cada fatura
      const invoicesWithPayments = await Promise.all(
        data.debts.map(async (invoice) => {
          try {
            const payments = await api.get<{ transactions: Array<{ amount: number }> }>(
              `/transactions?debtId=${invoice._id}`
            );
            const totalPaid = payments.transactions.reduce((sum, t) => sum + t.amount, 0);
            return { ...invoice, totalPaid };
          } catch {
            return { ...invoice, totalPaid: 0 };
          }
        })
      );
      setInvoices(invoicesWithPayments);
    } catch (error) {
      console.error('Error fetching invoices:', error);
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

  const handlePayInvoice = () => {
    // Calcular o total pendente da fatura
    const unpaidInvoices = invoices.filter(inv => !inv.paid);
    const totalUnpaid = unpaidInvoices.reduce((sum, inv) => {
      const remaining = inv.totalPaid ? inv.amount - inv.totalPaid : inv.amount;
      return sum + remaining;
    }, 0);
    
    setPayFormData({
      amount: totalUnpaid.toString(),
      payTotal: false,
      accountId: '',
      walletId: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setPaying(true);
    try {
      const unpaidInvoices = invoices.filter(inv => !inv.paid);
      if (unpaidInvoices.length === 0) {
        alert('Não há itens pendentes para pagar');
        setPaying(false);
        return;
      }

      // Calcular o total pendente
      const totalUnpaid = unpaidInvoices.reduce((sum, inv) => {
        const remaining = inv.totalPaid ? inv.amount - inv.totalPaid : inv.amount;
        return sum + remaining;
      }, 0);

      // Valor a pagar
      const paymentAmount = payFormData.payTotal 
        ? totalUnpaid 
        : parseFloat(payFormData.amount);

      if (paymentAmount <= 0) {
        alert('O valor deve ser maior que zero');
        setPaying(false);
        return;
      }

      if (paymentAmount > totalUnpaid) {
        alert(`O valor não pode ser maior que o total pendente (${formatCurrency(totalUnpaid)})`);
        setPaying(false);
        return;
      }

      // Preparar payload base
      const basePayload: any = {
        date: payFormData.date,
      };

      if (payFormData.accountId) {
        basePayload.accountId = payFormData.accountId;
      } else if (payFormData.walletId) {
        basePayload.walletId = payFormData.walletId;
      }

      // Distribuir o pagamento proporcionalmente entre os itens não pagos
      const totalAmount = unpaidInvoices.reduce((sum, inv) => {
        const remaining = inv.totalPaid ? inv.amount - inv.totalPaid : inv.amount;
        return sum + remaining;
      }, 0);

      // Calcular pagamentos proporcionais
      const payments: Array<{ invoiceId: string; amount: number }> = [];
      let totalCalculated = 0;

      unpaidInvoices.forEach((invoice, index) => {
        const remaining = invoice.totalPaid ? invoice.amount - invoice.totalPaid : invoice.amount;
        const proportion = remaining / totalAmount;
        let itemPaymentAmount = paymentAmount * proportion;

        // Arredondar para 2 casas decimais
        itemPaymentAmount = Math.round(itemPaymentAmount * 100) / 100;

        // No último item, ajustar para garantir que a soma seja exata
        if (index === unpaidInvoices.length - 1) {
          itemPaymentAmount = Math.round((paymentAmount - totalCalculated) * 100) / 100;
        }

        // Garantir que não pague mais que o restante
        if (itemPaymentAmount > remaining) {
          itemPaymentAmount = remaining;
        }

        if (itemPaymentAmount > 0) {
          payments.push({
            invoiceId: invoice._id,
            amount: itemPaymentAmount,
          });
          totalCalculated += itemPaymentAmount;
        }
      });

      // Executar pagamentos
      const paymentPromises = payments.map((payment) => {
        const payload = {
          ...basePayload,
          amount: payment.amount,
        };
        return api.post(`/debts/${payment.invoiceId}/pay`, payload);
      });

      await Promise.all(paymentPromises);

      setShowPayModal(false);
      setPayFormData({
        amount: '',
        payTotal: false,
        accountId: '',
        walletId: '',
        date: new Date().toISOString().split('T')[0],
      });
      fetchInvoices();
      fetchCreditCard(); // Atualizar limite do cartão
      alert('Pagamento realizado com sucesso!');
    } catch (error: any) {
      alert(error.message || 'Erro ao processar pagamento');
    } finally {
      setPaying(false);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    // Verificar se é parcelada
    if (invoice.installments && invoice.installments.total > 1) {
      setConfirmInvoice(invoice);
      setConfirmAction('edit');
      setShowConfirmModal(true);
    } else {
      setEditingInvoice(invoice);
      setEditFormData({
        description: invoice.description,
        amount: invoice.amount.toString(),
        dueDate: invoice.dueDate.split('T')[0],
        categoryId: invoice.categoryId?._id || '',
      });
      setShowEditModal(true);
    }
  };

  const handleConfirmEdit = (editAll: boolean) => {
    if (!confirmInvoice) return;
    
    setShowConfirmModal(false);
    setEditAllParcels(editAll);
    
    // Preparar dados para edição
    setEditingInvoice(confirmInvoice);
    setEditFormData({
      description: confirmInvoice.description.replace(/\s*\(\d+\/\d+\)$/, ''), // Remover número da parcela
      amount: confirmInvoice.amount.toString(),
      dueDate: confirmInvoice.dueDate.split('T')[0],
      categoryId: confirmInvoice.categoryId?._id || '',
    });
    setShowEditModal(true);
    setConfirmInvoice(null);
    setConfirmAction(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    setSubmitting(true);
    try {
      if (editAllParcels && editingInvoice.installments && editingInvoice.installments.total > 1) {
        // Buscar todas as parcelas relacionadas
        const relatedInvoices = invoices.filter(inv => {
          if (!inv.installments || !editingInvoice.installments) return false;
          // Extrair a descrição base (sem o número da parcela)
          const baseDesc = editingInvoice.description.replace(/\s*\(\d+\/\d+\)$/, '');
          const invBaseDesc = inv.description.replace(/\s*\(\d+\/\d+\)$/, '');
          return invBaseDesc === baseDesc && 
                 inv.installments.total === editingInvoice.installments.total;
        });
        
        // Editar todas as parcelas
        await Promise.all(relatedInvoices.map(inv => {
          const baseDesc = editFormData.description;
          return api.put(`/debts/${inv._id}`, {
            description: `${baseDesc} (${inv.installments?.current}/${inv.installments?.total})`,
            amount: parseFloat(editFormData.amount),
            dueDate: inv.dueDate.split('T')[0], // Manter a data de vencimento original de cada parcela
            categoryId: editFormData.categoryId || undefined,
          });
        }));
      } else {
        // Editar apenas esta parcela
        const description = editingInvoice.installments && editingInvoice.installments.total > 1
          ? `${editFormData.description} (${editingInvoice.installments.current}/${editingInvoice.installments.total})`
          : editFormData.description;
        
        await api.put(`/debts/${editingInvoice._id}`, {
          description: description,
          amount: parseFloat(editFormData.amount),
          dueDate: editFormData.dueDate,
          categoryId: editFormData.categoryId || undefined,
        });
      }
      
      setShowEditModal(false);
      setEditingInvoice(null);
      setEditAllParcels(false);
      fetchInvoices();
      fetchCreditCard(); // Atualizar limite do cartão
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar item da fatura');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    const invoice = invoices.find(inv => inv._id === invoiceId);
    
    if (!invoice) return;

    // Verificar se é parcelada
    if (invoice.installments && invoice.installments.total > 1) {
      setConfirmInvoice(invoice);
      setConfirmAction('delete');
      setShowConfirmModal(true);
    } else {
      if (!confirm('Tem certeza que deseja excluir este item da fatura?')) {
        return;
      }

      try {
        await api.delete(`/debts/${invoiceId}`);
        fetchInvoices();
        fetchCreditCard(); // Atualizar limite do cartão
      } catch (error: any) {
        alert(error.message || 'Erro ao excluir item da fatura');
      }
    }
  };

  const handleConfirmDelete = async (deleteAll: boolean) => {
    if (!confirmInvoice) return;

    setShowConfirmModal(false);

    try {
      if (deleteAll) {
        // Buscar todas as parcelas relacionadas
        const relatedInvoices = invoices.filter(inv => {
          if (!inv.installments || !confirmInvoice.installments) return false;
          // Extrair a descrição base (sem o número da parcela)
          const baseDesc = confirmInvoice.description.replace(/\s*\(\d+\/\d+\)$/, '');
          const invBaseDesc = inv.description.replace(/\s*\(\d+\/\d+\)$/, '');
          return invBaseDesc === baseDesc && 
                 inv.installments.total === confirmInvoice.installments.total;
        });

        // Excluir todas as parcelas
        await Promise.all(relatedInvoices.map(inv => api.delete(`/debts/${inv._id}`)));
      } else {
        // Excluir apenas esta parcela
        await api.delete(`/debts/${confirmInvoice._id}`);
      }

      fetchInvoices();
      fetchCreditCard(); // Atualizar limite do cartão
      setConfirmInvoice(null);
      setConfirmAction(null);
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir item(s) da fatura');
    }
  };

  const handleAddPurchase = () => {
    setAddFormData({
      description: '',
      amount: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      categoryId: '',
      type: 'single',
      installmentCount: '1',
      isTotalAmount: false,
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditCard) return;

    setSubmittingAdd(true);
    try {
      // Calcular data de vencimento baseada na data de compra e dia de vencimento do cartão
      const purchaseDateObj = new Date(addFormData.purchaseDate);
      const dueDateObj = new Date(purchaseDateObj);
      dueDateObj.setMonth(dueDateObj.getMonth() + 1);
      // Ajustar para o dia de vencimento do cartão (usar dueDate se disponível, senão bestPurchaseDay)
      dueDateObj.setDate(creditCard.dueDate || creditCard.bestPurchaseDay);
      
      const month = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}`;

      const payload: any = {
        description: addFormData.description,
        amount: parseFloat(addFormData.amount),
        type: addFormData.type === 'installment' ? 'installment' : 'monthly',
        creditCardId: cardId,
        purchaseDate: addFormData.purchaseDate,
        dueDate: dueDateObj.toISOString().split('T')[0],
        categoryId: addFormData.categoryId || undefined,
        month: month,
        paid: false,
      };

      if (addFormData.type === 'installment') {
        payload.installmentCount = parseInt(addFormData.installmentCount);
        payload.isTotalAmount = addFormData.isTotalAmount;
      }

      const response = await api.post<{ debt?: any; debts?: any[]; message?: string }>('/debts', payload);

      if (response.debts && response.debts.length > 1) {
        alert(`${response.debts.length} parcelas criadas com sucesso!`);
      }

      setShowAddModal(false);
      setAddFormData({
        description: '',
        amount: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        categoryId: '',
        type: 'single',
        installmentCount: '1',
        isTotalAmount: false,
      });
      fetchInvoices();
      fetchCreditCard(); // Atualizar limite do cartão
    } catch (error: any) {
      alert(error.message || 'Erro ao adicionar compra');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleAdjustment = () => {
    // Mostrar o valor atual total (compras + reajustes)
    const purchasesAmount = invoices
      .filter((inv) => !inv.description.includes('Reajuste de Fatura'))
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const adjustmentsAmount = invoices
      .filter((inv) => inv.description.includes('Reajuste de Fatura'))
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const currentTotal = purchasesAmount + adjustmentsAmount;
    
    setAdjustmentFormData({
      newTotalAmount: currentTotal.toString(),
      description: '',
    });
    setShowAdjustmentModal(true);
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditCard) return;

    setSubmittingAdjustment(true);
    try {
      // Usar o mês que está sendo visualizado na tela (currentMonth)
      // O reajuste deve ser aplicado exclusivamente naquele mês
      const [year, month] = currentMonth.split('-').map(Number);
      
      // Calcular data de vencimento baseada no mês visualizado e dia de vencimento do cartão
      const dueDateObj = new Date(year, month - 1, creditCard.dueDate || creditCard.bestPurchaseDay);
      
      // Garantir que o mês seja exatamente o currentMonth
      const monthString = currentMonth;

      // O valor informado é o valor TOTAL da fatura que o usuário vai pagar
      const newTotalInvoiceAmount = parseFloat(adjustmentFormData.newTotalAmount);

      if (newTotalInvoiceAmount < 0) {
        alert('O valor da fatura não pode ser negativo.');
        setSubmittingAdjustment(false);
        return;
      }

      // Calcular o valor atual total (compras + reajustes anteriores)
      const purchasesAmount = invoices
        .filter((inv) => !inv.description.includes('Reajuste de Fatura'))
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      
      const previousAdjustmentsAmount = invoices
        .filter((inv) => inv.description.includes('Reajuste de Fatura'))
        .reduce((sum, invoice) => sum + invoice.amount, 0);
      
      const currentTotalAmount = purchasesAmount + previousAdjustmentsAmount;
      
      // Calcular a diferença (este é o valor que será salvo como amount do reajuste)
      const adjustmentDifference = newTotalInvoiceAmount - currentTotalAmount;

      // Se não houver diferença, não criar reajuste
      if (adjustmentDifference === 0) {
        alert('O novo valor é igual ao valor atual. Não há necessidade de reajuste.');
        setSubmittingAdjustment(false);
        return;
      }

      const description = adjustmentFormData.description.trim() 
        ? `Reajuste de Fatura: ${adjustmentFormData.description}`
        : 'Reajuste de Fatura';

      // Sempre criar um novo reajuste (não atualizar o anterior)
      // Cada reajuste é um item separado na listagem
      await api.post('/debts', {
        description: description,
        amount: adjustmentDifference, // Salvar a DIFERENÇA, não o valor total
        type: 'monthly',
        creditCardId: cardId,
        dueDate: dueDateObj.toISOString().split('T')[0],
        month: monthString, // Usar o mês que está sendo visualizado
        paid: false,
      });

      setShowAdjustmentModal(false);
      setAdjustmentFormData({
        newTotalAmount: '',
        description: '',
      });
      fetchInvoices();
      fetchCreditCard();
    } catch (error: any) {
      alert(error.message || 'Erro ao adicionar reajuste');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  // Separar compras e reajustes
  const purchases = invoices.filter((inv) => !inv.description.includes('Reajuste de Fatura'));
  const adjustments = invoices.filter((inv) => inv.description.includes('Reajuste de Fatura'));
  
  // Se houver reajuste, os itens anteriores (compras) NÃO são considerados
  // O total da fatura é apenas a soma dos reajustes
  const purchasesAmount = purchases.reduce((sum, invoice) => sum + invoice.amount, 0);
  const adjustmentsAmount = adjustments.reduce((sum, invoice) => sum + invoice.amount, 0);
  
  // Quando há reajuste, o total é: compras + reajustes (porque os reajustes são diferenças)
  // Mas o valor final que o usuário paga é: compras + soma dos reajustes
  const totalAmount = adjustments.length > 0
    ? purchasesAmount + adjustmentsAmount  // Compras + diferenças dos reajustes = valor total final
    : purchasesAmount; // Quando não há reajuste, apenas compras
  
  // Para o cálculo de pago e pendente
  const paidPurchases = purchases
    .filter((invoice) => invoice.paid)
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidAdjustments = adjustments
    .filter((invoice) => invoice.paid)
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  
  const paidAmount = adjustments.length > 0
    ? paidPurchases + paidAdjustments
    : paidPurchases;
  
  const unpaidAmount = totalAmount - paidAmount;
  
  // Para o modal de reajuste, mostrar o valor atual total (compras + reajustes)
  const currentTotal = purchasesAmount + adjustmentsAmount;
  
  // Total das compras (sem reajustes) para exibição no modal
  const totalPurchases = purchasesAmount;

  if (loading && !creditCard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!creditCard) {
    return null;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Voltar para Cartões
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Faturas - {creditCard.name}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Visualize e gerencie as faturas deste cartão
        </p>
      </div>

      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Limite Total</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(creditCard.limit)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Limite Disponível</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(creditCard.availableLimit)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Dia de Vencimento</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              Dia {creditCard.dueDate || creditCard.bestPurchaseDay}
            </p>
          </div>
        </div>
      </div>

      <MonthSelector value={currentMonth} onChange={setCurrentMonth} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total da Fatura</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Pago</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(paidAmount)}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Pendente</h3>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {formatCurrency(unpaidAmount)}
          </p>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Itens da Fatura</h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePayInvoice}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={invoices.filter(inv => !inv.paid).length === 0}
            >
              Pagar Fatura
            </button>
            <button
              onClick={handleAdjustment}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Reajustar Fatura
            </button>
            <button
              onClick={handleAddPurchase}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              + Adicionar Compra
            </button>
          </div>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma fatura encontrada para este mês.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <li key={invoice._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.paid
                            ? 'bg-green-100 text-green-800'
                            : invoice.totalPaid && invoice.totalPaid > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {invoice.paid 
                          ? 'Pago Total' 
                          : invoice.totalPaid && invoice.totalPaid > 0
                          ? `Pago Parcial (${formatCurrency(invoice.totalPaid)} / ${formatCurrency(invoice.amount)})`
                          : 'Pendente'}
                      </span>
                      {invoice.categoryId && (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: invoice.categoryId.color
                              ? `${invoice.categoryId.color}20`
                              : '#f3f4f6',
                            color: invoice.categoryId.color || '#6b7280',
                          }}
                        >
                          {invoice.categoryId.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {invoice.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Vencimento: {formatDate(invoice.dueDate)}
                      {invoice.paid && invoice.paidAt && (
                        <span> • Pago em: {formatDate(invoice.paidAt)}</span>
                      )}
                    </p>
                  </div>
                    <div className="ml-4 flex items-center space-x-2">
                    <div>
                      <span
                        className={`text-lg font-semibold ${
                          invoice.paid 
                            ? 'text-green-600' 
                            : invoice.description.includes('Reajuste de Fatura')
                            ? invoice.amount >= 0 ? 'text-blue-600' : 'text-red-600'
                            : 'text-red-600'
                        }`}
                      >
                        {invoice.description.includes('Reajuste de Fatura') && invoice.amount >= 0 ? '+' : ''}
                        {formatCurrency(invoice.amount)}
                      </span>
                      {invoice.totalPaid && invoice.totalPaid > 0 && !invoice.paid && (
                        <p className="text-xs text-gray-500 mt-1">
                          Restante: {formatCurrency(invoice.amount - invoice.totalPaid)}
                        </p>
                      )}
                    </div>
                    {!invoice.paid && (
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => handleEdit(invoice)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
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
                          onClick={() => handleDelete(invoice._id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
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
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de Adicionar Compra */}
      {showAddModal && creditCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white m-4">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Adicionar Compra - {creditCard.name}
              </h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <input
                    type="text"
                    required
                    value={addFormData.description}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, description: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: Supermercado, Restaurante..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    value={addFormData.type}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, type: e.target.value as any })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="single">Compra Única</option>
                    <option value="installment">Parcelada</option>
                  </select>
                </div>
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
                      value={addFormData.amount}
                      onChange={(e) =>
                        setAddFormData({ ...addFormData, amount: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Data de Compra
                    </label>
                    <input
                      type="date"
                      required
                      value={addFormData.purchaseDate}
                      onChange={(e) =>
                        setAddFormData({ ...addFormData, purchaseDate: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                {addFormData.type === 'installment' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantidade de Parcelas
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={addFormData.installmentCount}
                        onChange={(e) =>
                          setAddFormData({ ...addFormData, installmentCount: e.target.value })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
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
                            checked={!addFormData.isTotalAmount}
                            onChange={(e) => setAddFormData({ ...addFormData, isTotalAmount: false })}
                            className="mr-2"
                          />
                          <span>Valor da Parcela</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={addFormData.isTotalAmount}
                            onChange={(e) => setAddFormData({ ...addFormData, isTotalAmount: true })}
                            className="mr-2"
                          />
                          <span>Valor Total</span>
                        </label>
                      </div>
                      {addFormData.isTotalAmount && addFormData.installmentCount && (
                        <p className="mt-2 text-sm text-gray-600">
                          Cada parcela será de:{' '}
                          {formatCurrency(parseFloat(addFormData.amount || '0') / parseInt(addFormData.installmentCount))}
                        </p>
                      )}
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria
                  </label>
                  <select
                    value={addFormData.categoryId}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, categoryId: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setAddFormData({
                        description: '',
                        amount: '',
                        purchaseDate: new Date().toISOString().split('T')[0],
                        categoryId: '',
                        type: 'single',
                        installmentCount: '1',
                        isTotalAmount: false,
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {submittingAdd ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reajuste de Fatura */}
      {showAdjustmentModal && creditCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Reajustar Fatura
              </h3>
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-1">
                  Valor Atual Total: <strong>{formatCurrency(currentTotal)}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  (Compras: {formatCurrency(totalPurchases)} + Reajustes: {formatCurrency(adjustmentsAmount)})
                </p>
                <p className="text-sm text-gray-600">
                  Informe o valor total que será pago na fatura. O sistema calculará a diferença automaticamente.
                </p>
              </div>
                <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valor Total da Fatura (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={adjustmentFormData.newTotalAmount}
                      onChange={(e) =>
                        setAdjustmentFormData({ ...adjustmentFormData, newTotalAmount: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 520.00"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Este é o valor total que você vai pagar na fatura (incluindo juros, IOF, descontos, etc.)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Descrição (Opcional)
                    </label>
                    <input
                      type="text"
                      value={adjustmentFormData.description}
                      onChange={(e) =>
                        setAdjustmentFormData({ ...adjustmentFormData, description: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Juros, IOF, Desconto por pontuação..."
                    />
                  </div>
                  {adjustmentFormData.newTotalAmount && (
                    <div className="p-3 bg-blue-50 rounded-md space-y-2">
                      <p className="text-sm text-gray-700">
                        <strong>Valor Atual:</strong>{' '}
                        <span className="font-semibold">{formatCurrency(currentTotal)}</span>
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Novo Valor Total:</strong>{' '}
                        <span className="font-semibold">{formatCurrency(parseFloat(adjustmentFormData.newTotalAmount || '0'))}</span>
                      </p>
                      {parseFloat(adjustmentFormData.newTotalAmount || '0') !== currentTotal && (
                        <div className="pt-2 border-t border-blue-200">
                          <p className="text-sm text-gray-700">
                            <strong>Diferença:</strong>{' '}
                            <span className={`text-lg font-bold ${
                              parseFloat(adjustmentFormData.newTotalAmount || '0') - currentTotal >= 0 
                                ? 'text-blue-600' 
                                : 'text-red-600'
                            }`}>
                              {parseFloat(adjustmentFormData.newTotalAmount || '0') - currentTotal >= 0 ? '+' : ''}
                              {formatCurrency(parseFloat(adjustmentFormData.newTotalAmount || '0') - currentTotal)}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustmentModal(false);
                      setAdjustmentFormData({
                        newTotalAmount: '',
                        description: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdjustment}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingAdjustment ? 'Salvando...' : 'Aplicar Reajuste'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Parcelas */}
      {showConfirmModal && confirmInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {confirmAction === 'edit' ? 'Editar Compra Parcelada' : 'Excluir Compra Parcelada'}
              </h3>
              <div className="mb-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-gray-700 mb-2">
                  Esta compra possui <strong>{confirmInvoice.installments?.total} parcelas</strong>.
                </p>
                <p className="text-sm text-gray-700">
                  {confirmAction === 'edit' 
                    ? 'Deseja editar apenas esta parcela ou todas as parcelas?'
                    : 'Deseja excluir apenas esta parcela ou todas as parcelas?'}
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (confirmAction === 'edit') {
                      handleConfirmEdit(false);
                    } else {
                      handleConfirmDelete(false);
                    }
                  }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-left"
                >
                  <div className="font-semibold">Apenas esta parcela</div>
                  <div className="text-sm text-blue-100">
                    {confirmInvoice.description}
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (confirmAction === 'edit') {
                      handleConfirmEdit(true);
                    } else {
                      handleConfirmDelete(true);
                    }
                  }}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 text-left"
                >
                  <div className="font-semibold">Todas as {confirmInvoice.installments?.total} parcelas</div>
                  <div className="text-sm text-red-100">
                    Esta ação afetará todas as parcelas relacionadas
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmInvoice(null);
                    setConfirmAction(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {showPayModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Pagar Fatura
              </h3>
              {(() => {
                const unpaidInvoices = invoices.filter(inv => !inv.paid);
                const totalUnpaid = unpaidInvoices.reduce((sum, inv) => {
                  const remaining = inv.totalPaid ? inv.amount - inv.totalPaid : inv.amount;
                  return sum + remaining;
                }, 0);
                const totalPaid = invoices.reduce((sum, inv) => sum + (inv.totalPaid || 0), 0);
                const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

                return (
                  <>
                    <div className="text-sm text-gray-600 mb-4 space-y-1 p-3 bg-gray-50 rounded-md">
                      <p><strong>Total da Fatura:</strong> {formatCurrency(totalAmount)}</p>
                      {totalPaid > 0 && (
                        <p><strong>Já Pago:</strong> {formatCurrency(totalPaid)}</p>
                      )}
                      <p><strong>Pendente:</strong> {formatCurrency(totalUnpaid)}</p>
                    </div>
                    <form onSubmit={handlePaySubmit} className="space-y-4">
                      <div>
                        <label className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={payFormData.payTotal}
                            onChange={(e) => {
                              setPayFormData({
                                ...payFormData,
                                payTotal: e.target.checked,
                                amount: e.target.checked ? totalUnpaid.toString() : payFormData.amount,
                              });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Pagar Total ({formatCurrency(totalUnpaid)})
                          </span>
                        </label>
                      </div>
                      {!payFormData.payTotal && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Valor a Pagar (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={totalUnpaid}
                            required={!payFormData.payTotal}
                            value={payFormData.amount}
                            onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Máximo: {formatCurrency(totalUnpaid)}
                          </p>
                        </div>
                      )}
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
                            setPayFormData({
                              amount: '',
                              payTotal: false,
                              accountId: '',
                              walletId: '',
                              date: new Date().toISOString().split('T')[0],
                            });
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
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Editar Item da Fatura
              </h3>
              {editAllParcels && editingInvoice?.installments && editingInvoice.installments.total > 1 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> As alterações serão aplicadas a todas as {editingInvoice.installments.total} parcelas desta compra.
                  </p>
                </div>
              )}
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.description}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, description: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    value={editFormData.amount}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, amount: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.dueDate}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, dueDate: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria
                  </label>
                  <select
                    value={editFormData.categoryId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, categoryId: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingInvoice(null);
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

