'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

type Debt = {
  _id: string;
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  categoryId?: { name: string; color?: string };
  creditCardId?: { name: string };
  installments?: { current: number; total: number };
};

type DebtGroup = Debt & { debts?: Debt[] };

type CreditCardSummary = {
  _id: string;
  name: string;
  limit: number;
  availableLimit: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalDebts: 0,
    totalCreditCards: 0,
    totalAccounts: 0,
    totalInvestments: 0,
  });
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOverdueDetails, setShowOverdueDetails] = useState(false);
  const [creditCards, setCreditCards] = useState<CreditCardSummary[]>([]);
  const [showCardsDetails, setShowCardsDetails] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [debtsSummaryRes, cardsRes, accountsRes, investmentsRes, debtsRes] =
        await Promise.all([
          api.get<{ summary: { total: number } }>('/debts/summary'),
          api.get<{ creditCards: CreditCardSummary[] }>('/credit-cards'),
          api.get<{ accounts: any[] }>('/accounts'),
          api.get<{ investments: any[] }>('/investments'),
          api.get<{ debts: Debt[] }>('/debts?paid=false'),
        ]);

      setStats({
        totalDebts: debtsSummaryRes.summary.total,
        totalCreditCards: cardsRes.creditCards.length,
        totalAccounts: accountsRes.accounts.length,
        totalInvestments: investmentsRes.investments.length,
      });
      setDebts(debtsRes.debts);
      setCreditCards(cardsRes.creditCards);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isOverdue = (debt: Debt) => {
    if (debt.paid) return false;
    const due = new Date(debt.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const monthKeyFromDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().slice(0, 7); // YYYY-MM
  };

  const currentMonthKey = useMemo(
    () => monthKeyFromDate(new Date()),
    []
  );

  const overdueDebts = useMemo(
    () => debts.filter((d) => !d.paid && isOverdue(d)),
    [debts]
  );

  const totalOverdue = useMemo(
    () => overdueDebts.reduce((sum, d) => sum + d.amount, 0),
    [overdueDebts]
  );

  const totalCardsLimit = useMemo(
    () => creditCards.reduce((sum, c) => sum + c.limit, 0),
    [creditCards]
  );

  const totalCardsAvailable = useMemo(
    () => creditCards.reduce((sum, c) => sum + c.availableLimit, 0),
    [creditCards]
  );

  const currentMonthDebts = useMemo(
    () => debts.filter((d) => monthKeyFromDate(d.dueDate) === currentMonthKey),
    [debts, currentMonthKey]
  );

  const currentMonthTotals = useMemo(() => {
    const total = currentMonthDebts.reduce((sum, d) => sum + d.amount, 0);
    const overdue = currentMonthDebts
      .filter((d) => isOverdue(d))
      .reduce((sum, d) => sum + d.amount, 0);
    const pending = total - overdue;
    return { total, overdue, pending };
  }, [currentMonthDebts]);

  const overdueByMonth = useMemo(() => {
    const groups: Record<string, Debt[]> = {};
    overdueDebts.forEach((debt) => {
      const key = monthKeyFromDate(debt.dueDate);
      if (!groups[key]) groups[key] = [];
      groups[key].push(debt);
    });
    return groups;
  }, [overdueDebts]);

  const groupDebtsLikeDebtsPage = (items: Debt[]): DebtGroup[] => {
    const groupedCards: Record<string, DebtGroup> = {};
    const result: DebtGroup[] = [];

    items.forEach((debt) => {
      // Dívida que não é de cartão: entra direto como linha única
      if (!debt.creditCardId) {
        result.push({ ...debt });
        return;
      }

      const cardKey = debt.creditCardId.name;

      if (!groupedCards[cardKey]) {
        groupedCards[cardKey] = {
          ...debt,
          description: debt.creditCardId.name,
          amount: 0,
          debts: [],
        };
      }

      groupedCards[cardKey].amount += debt.amount;
      groupedCards[cardKey].debts!.push(debt);

      // manter a data de vencimento mais antiga como referência para ordenação
      const currentDue = new Date(groupedCards[cardKey].dueDate).getTime();
      const newDue = new Date(debt.dueDate).getTime();
      if (newDue < currentDue) {
        groupedCards[cardKey].dueDate = debt.dueDate;
      }
    });

    const all = [...result, ...Object.values(groupedCards)];

    // ordenar por vencimento, da mais antiga para a mais recente
    all.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    return all;
  };

  const groupDebtsByCard = (debtsToGroup: Debt[]) => {
    const groups: Record<string, { label: string; debts: Debt[] }> = {};

    debtsToGroup.forEach((debt) => {
      const key = debt.creditCardId?.name || 'Outras dívidas';
      if (!groups[key]) {
        groups[key] = {
          label: debt.creditCardId?.name || 'Outras dívidas',
          debts: [],
        };
      }
      groups[key].debts.push(debt);
    });

    // ordenar dívidas internamente por vencimento (mais antiga primeiro)
    Object.values(groups).forEach((group) => {
      group.debts.sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
    });

    return groups;
  };

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split('-').map(Number);
    const d = new Date(year, (month || 1) - 1, 1);
    return d.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Visão geral das suas finanças
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">💰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Dívidas
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.totalDebts)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowOverdueDetails((prev) => !prev)}
          className="bg-white overflow-hidden shadow rounded-lg text-left hover:shadow-md transition-shadow"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center">
                  <span className="text-red-700 text-xl">⏰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Atrasado (todos os meses)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalOverdue)}
                  </dd>
                  <dd className="mt-1 text-xs text-red-600">
                    Clique para ver detalhes por mês
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </button>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 text-xl">📅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Mês Atual - Resumo
                  </dt>
                  <dd className="mt-1 text-xs text-gray-500">
                    Total: {formatCurrency(currentMonthTotals.total)}
                  </dd>
                  <dd className="mt-1 text-xs text-red-600">
                    Atrasado: {formatCurrency(currentMonthTotals.overdue)}
                  </dd>
                  <dd className="mt-1 text-xs text-yellow-600">
                    Pendente: {formatCurrency(currentMonthTotals.pending)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCardsDetails((prev) => !prev)}
          className="bg-white overflow-hidden shadow rounded-lg text-left hover:shadow-md transition-shadow"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl">💳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cartões de Crédito ({stats.totalCreditCards})
                  </dt>
                  <dd className="mt-1 text-xs text-gray-500">
                    Limite total:{' '}
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(totalCardsLimit)}
                    </span>
                  </dd>
                  <dd className="mt-1 text-xs text-green-600">
                    Disponível:{' '}
                    <span className="font-semibold">
                      {formatCurrency(totalCardsAvailable)}
                    </span>
                  </dd>
                  <dd className="mt-1 text-[11px] text-blue-600">
                    Clique para ver limites por cartão
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </button>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xl">🏦</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Contas Bancárias
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalAccounts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 text-xl">📈</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Investimentos
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalInvestments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOverdueDetails && (
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Dívidas em Atraso por Mês
              </h2>
              <button
                type="button"
                onClick={() => setShowOverdueDetails(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Fechar
              </button>
            </div>

            {overdueDebts.length === 0 ? (
              <p className="text-sm text-gray-500">
                No momento você não possui dívidas em atraso.
              </p>
            ) : (
              Object.keys(overdueByMonth)
                .sort((a, b) => (a > b ? -1 : 1)) // meses mais recentes primeiro
                .map((monthKey) => {
                  const monthDebts = overdueByMonth[monthKey];
                  const monthTotal = monthDebts.reduce(
                    (sum, d) => sum + d.amount,
                    0
                  );
                  const grouped = groupDebtsLikeDebtsPage(monthDebts);

                  return (
                    <div key={monthKey} className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-md font-semibold text-gray-800">
                          {formatMonthLabel(monthKey)}
                        </h3>
                        <span className="text-sm font-medium text-red-600">
                          {formatCurrency(monthTotal)}
                        </span>
                      </div>
                      <ul className="divide-y divide-gray-200">
                        {grouped.map((debt) => (
                          <li
                            key={debt._id}
                            className="py-2 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900">
                                  {debt.description}
                                </p>
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-800 text-white">
                                  Vencida
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                Vencimento: {formatDate(debt.dueDate)}
                              </p>
                              {debt.categoryId && (
                                <span
                                  className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: debt.categoryId.color
                                      ? `${debt.categoryId.color}20`
                                      : '#f3f4f6',
                                    color:
                                      debt.categoryId.color || '#6b7280',
                                  }}
                                >
                                  {debt.categoryId.name}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-red-600">
                                {formatCurrency(debt.amount)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {showCardsDetails && (
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Cartões de Crédito - Limites
              </h2>
              <button
                type="button"
                onClick={() => setShowCardsDetails(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Fechar
              </button>
            </div>

            {creditCards.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhum cartão de crédito cadastrado.
              </p>
            ) : (
              <div className="space-y-3">
                {creditCards.map((card) => (
                  <div
                    key={card._id}
                    className="flex items-center justify-between border border-gray-100 rounded-md px-4 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {card.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Limite:{' '}
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(card.limit)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Disponível</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(card.availableLimit)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dívidas do mês atual - atrasadas e pendentes */}
      <div className="mt-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Dívidas do Mês Atual ({formatMonthLabel(currentMonthKey)})
          </h2>
          {currentMonthDebts.length === 0 ? (
            <p className="text-sm text-gray-500">
              Não há dívidas cadastradas para o mês atual.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-semibold text-red-600 mb-2">
                  Atrasadas
                </h3>
                {currentMonthDebts.filter(isOverdue).length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nenhuma dívida atrasada neste mês.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {groupDebtsLikeDebtsPage(
                      currentMonthDebts.filter(isOverdue)
                    ).map((debt) => (
                      <li
                        key={debt._id}
                        className="py-2 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {debt.description}
                            </p>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-800 text-white">
                              Vencida
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Vencimento: {formatDate(debt.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-600">
                            {formatCurrency(debt.amount)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-md font-semibold text-yellow-600 mb-2">
                  Pendentes (a vencer)
                </h3>
                {currentMonthDebts.filter((d) => !isOverdue(d)).length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nenhuma dívida pendente neste mês.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {groupDebtsLikeDebtsPage(
                      currentMonthDebts.filter((d) => !isOverdue(d))
                    ).map((debt) => (
                      <li
                        key={debt._id}
                        className="py-2 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {debt.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            Vencimento: {formatDate(debt.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-yellow-600">
                            {formatCurrency(debt.amount)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dashboard/credit-cards"
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Adicionar Cartão
            </Link>
            <Link
              href="/dashboard/debts"
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Adicionar Dívida
            </Link>
            <Link
              href="/dashboard/categories"
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Gerenciar Categorias
            </Link>
            <Link
              href="/dashboard/accounts"
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              Adicionar Conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



















