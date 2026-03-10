'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatDate, getLocalDateString, getLocalMonthKey } from '@/lib/utils';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';
import { useFinanceData, type Debt as FinanceDebt } from '@/hooks/useFinanceData';

type Debt = FinanceDebt;
type DebtGroup = Debt & { debts?: Debt[] };

export default function DashboardPage() {
  const { dashboardData, dashboardLoading, loadDashboard } = useFinanceData();
  const [showOverdueDetails, setShowOverdueDetails] = useState(false);
  const [showCardsDetails, setShowCardsDetails] = useState(false);
  const [showAccountsDetails, setShowAccountsDetails] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = dashboardData?.stats ?? {
    totalDebts: 0,
    totalCreditCards: 0,
    totalAccounts: 0,
    totalInvestments: 0,
  };
  const debts = (dashboardData?.debts ?? []) as Debt[];
  const creditCards = dashboardData?.creditCards ?? [];
  const accounts = dashboardData?.accounts ?? [];
  const loading = dashboardLoading && !dashboardData;

  const todayStr = useMemo(() => getLocalDateString(), []);

  const isOverdue = (debt: Debt) => {
    if (debt.paid) return false;
    const dueDateStr = typeof debt.dueDate === 'string' ? debt.dueDate.slice(0, 10) : '';
    return dueDateStr < todayStr;
  };

  const monthKeyFromDate = (date: string | Date) => {
    if (typeof date === 'string') return date.slice(0, 7);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const currentMonthKey = useMemo(
    () => getLocalMonthKey(),
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

  const totalAccountsBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + acc.balance, 0),
    [accounts]
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
    <div
      className={`min-h-screen px-4 py-8 ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900'
          : 'bg-gray-50'
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1
            className={`text-3xl font-bold ${
              isDark ? 'text-slate-100' : 'text-gray-900'
            }`}
          >
            Dashboard
          </h1>
          <p
            className={`mt-2 text-sm ${
              isDark ? 'text-slate-300' : 'text-gray-600'
            }`}
          >
            Visão geral das suas finanças
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className={`overflow-hidden shadow-lg rounded-xl ${
              isDark
                ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
                : 'bg-white border border-gray-100'
            }`}
          >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-emerald-500/10' : 'bg-red-100'
                  }`}
                >
                  <span
                    className={`text-xl ${
                      isDark ? 'text-emerald-400' : 'text-red-600'
                    }`}
                  >
                    💰
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt
                    className={`text-sm font-medium truncate ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Total de Dívidas
                  </dt>
                  <dd
                    className={`text-lg font-semibold ${
                      isDark ? 'text-slate-50' : 'text-gray-900'
                    }`}
                  >
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
          className={`overflow-hidden shadow-lg rounded-xl text-left transition-all ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 hover:shadow-xl hover:border-emerald-400/60 backdrop-blur'
              : 'bg-white border border-gray-100 hover:shadow-md'
          }`}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-red-500/10' : 'bg-red-200'
                  }`}
                >
                  <span
                    className={`text-xl ${
                      isDark ? 'text-red-400' : 'text-red-700'
                    }`}
                  >
                    ⏰
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt
                    className={`text-sm font-medium truncate ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Total Atrasado (todos os meses)
                  </dt>
                  <dd
                    className={`text-lg font-semibold ${
                      isDark ? 'text-slate-50' : 'text-gray-900'
                    }`}
                  >
                    {formatCurrency(totalOverdue)}
                  </dd>
                  <dd
                    className={`mt-1 text-xs ${
                      isDark ? 'text-red-300' : 'text-red-600'
                    }`}
                  >
                    Clique para ver detalhes por mês
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </button>

        <div
          className={`overflow-hidden shadow-lg rounded-xl ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
              : 'bg-white border border-gray-100'
          }`}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-cyan-500/10' : 'bg-indigo-100'
                  }`}
                >
                  <span
                    className={`text-xl ${
                      isDark ? 'text-cyan-400' : 'text-indigo-600'
                    }`}
                  >
                    📅
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt
                    className={`text-sm font-medium truncate ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Mês Atual - Resumo
                  </dt>
                  <dd
                    className={`mt-1 text-xs ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Total: {formatCurrency(currentMonthTotals.total)}
                  </dd>
                  <dd
                    className={`mt-1 text-xs ${
                      isDark ? 'text-red-300' : 'text-red-600'
                    }`}
                  >
                    Atrasado: {formatCurrency(currentMonthTotals.overdue)}
                  </dd>
                  <dd
                    className={`mt-1 text-xs ${
                      isDark ? 'text-yellow-300' : 'text-yellow-600'
                    }`}
                  >
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
          className={`overflow-hidden shadow-lg rounded-xl text-left transition-all ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 hover:shadow-xl hover:border-emerald-400/60 backdrop-blur'
              : 'bg-white border border-gray-100 hover:shadow-md'
          }`}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-blue-500/10' : 'bg-blue-100'
                  }`}
                >
                  <span
                    className={`text-xl ${
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  >
                    💳
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt
                    className={`text-sm font-medium truncate ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Cartões de Crédito ({stats.totalCreditCards})
                  </dt>
                  <dd
                    className={`mt-1 text-xs ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Limite total:{' '}
                    <span
                      className={`font-semibold ${
                        isDark ? 'text-slate-50' : 'text-gray-900'
                      }`}
                    >
                      {formatCurrency(totalCardsLimit)}
                    </span>
                  </dd>
                  <dd
                    className={`mt-1 text-xs ${
                      isDark ? 'text-emerald-300' : 'text-green-600'
                    }`}
                  >
                    Disponível:{' '}
                    <span className="font-semibold">
                      {formatCurrency(totalCardsAvailable)}
                    </span>
                  </dd>
                  <dd
                    className={`mt-1 text-[11px] ${
                      isDark ? 'text-blue-300' : 'text-blue-600'
                    }`}
                  >
                    Clique para ver limites por cartão
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowAccountsDetails((prev) => !prev)}
          className={`overflow-hidden shadow-lg rounded-xl text-left transition-all ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 hover:shadow-xl hover:border-emerald-400/60 backdrop-blur'
              : 'bg-white border border-gray-100 hover:shadow-md'
          }`}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-emerald-500/10' : 'bg-green-100'
                  }`}
                >
                  <span
                    className={`text-xl ${
                      isDark ? 'text-emerald-400' : 'text-green-600'
                    }`}
                  >
                    🏦
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt
                    className={`text-sm font-medium truncate ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Contas Bancárias ({stats.totalAccounts})
                  </dt>
                  <dd
                    className={`mt-1 text-xs ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Saldo total:{' '}
                    <span
                      className={`font-semibold ${
                        isDark ? 'text-slate-50' : 'text-gray-900'
                      }`}
                    >
                      {formatCurrency(totalAccountsBalance)}
                    </span>
                  </dd>
                  <dd
                    className={`mt-1 text-[11px] ${
                      isDark ? 'text-emerald-300' : 'text-green-700'
                    }`}
                  >
                    Clique para ver saldo por conta
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </button>

        <div
          className={`overflow-hidden shadow-lg rounded-xl ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
              : 'bg-white border border-gray-100'
          }`}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-yellow-500/10' : 'bg-yellow-100'
                  }`}
                >
                  <span
                    className={`text-xl ${
                      isDark ? 'text-yellow-300' : 'text-yellow-600'
                    }`}
                  >
                    📈
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt
                    className={`text-sm font-medium truncate ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Investimentos
                  </dt>
                  <dd
                    className={`text-lg font-semibold ${
                      isDark ? 'text-slate-50' : 'text-gray-900'
                    }`}
                  >
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
          <div
            className={`shadow-lg rounded-xl p-6 ${
              isDark
                ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`text-lg font-semibold ${
                  isDark ? 'text-slate-100' : 'text-gray-900'
                }`}
              >
                Dívidas em Atraso por Mês
              </h2>
              <button
                type="button"
                onClick={() => setShowOverdueDetails(false)}
                className={`text-sm ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Fechar
              </button>
            </div>

            {overdueDebts.length === 0 ? (
              <p
                className={`text-sm ${
                  isDark ? 'text-slate-300' : 'text-gray-500'
                }`}
              >
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
                        <h3
                          className={`text-md font-semibold ${
                            isDark ? 'text-slate-100' : 'text-gray-800'
                          }`}
                        >
                          {formatMonthLabel(monthKey)}
                        </h3>
                        <span
                          className={`text-sm font-medium ${
                            isDark ? 'text-red-300' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(monthTotal)}
                        </span>
                      </div>
                      <ul
                        className={`divide-y ${
                          isDark ? 'divide-slate-800' : 'divide-gray-200'
                        }`}
                      >
                        {grouped.map((debt) => (
                          <li
                            key={debt._id}
                            className="py-2 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center">
                                <p
                                  className={`text-sm font-medium ${
                                    isDark ? 'text-slate-100' : 'text-gray-900'
                                  }`}
                                >
                                  {debt.description}
                                </p>
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-800 text-red-100">
                                  Vencida
                                </span>
                              </div>
                              <p
                                className={`text-xs ${
                                  isDark ? 'text-slate-400' : 'text-gray-500'
                                }`}
                              >
                                Vencimento: {formatDate(debt.dueDate)}
                              </p>
                              {debt.categoryId && (
                                <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-100">
                                  {debt.categoryId.name}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm font-semibold ${
                                  isDark ? 'text-red-300' : 'text-red-600'
                                }`}
                              >
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
          <div
            className={`shadow-lg rounded-xl p-6 ${
              isDark
                ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`text-lg font-semibold ${
                  isDark ? 'text-slate-100' : 'text-gray-900'
                }`}
              >
                Cartões de Crédito - Limites
              </h2>
              <button
                type="button"
                onClick={() => setShowCardsDetails(false)}
                className={`text-sm ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Fechar
              </button>
            </div>

            {creditCards.length === 0 ? (
              <p
                className={`text-sm ${
                  isDark ? 'text-slate-300' : 'text-gray-500'
                }`}
              >
                Nenhum cartão de crédito cadastrado.
              </p>
            ) : (
              <div className="space-y-3">
                {creditCards.map((card) => (
                  <div
                    key={card._id}
                    className={`flex items-center justify-between rounded-md px-4 py-2 border ${
                      isDark ? 'border-slate-800' : 'border-gray-100'
                    }`}
                  >
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          isDark ? 'text-slate-100' : 'text-gray-900'
                        }`}
                      >
                        {card.name}
                      </p>
                      <p
                        className={`text-xs ${
                          isDark ? 'text-slate-400' : 'text-gray-500'
                        }`}
                      >
                        Limite:{' '}
                        <span
                          className={`font-semibold ${
                            isDark ? 'text-slate-50' : 'text-gray-900'
                          }`}
                        >
                          {formatCurrency(card.limit)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xs ${
                          isDark ? 'text-slate-400' : 'text-gray-500'
                        }`}
                      >
                        Disponível
                      </p>
                      <p
                        className={`text-sm font-semibold ${
                          isDark ? 'text-emerald-300' : 'text-green-600'
                        }`}
                      >
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

      {showAccountsDetails && (
        <div className="mt-8">
          <div
            className={`shadow-lg rounded-xl p-6 ${
              isDark
                ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`text-lg font-semibold ${
                  isDark ? 'text-slate-100' : 'text-gray-900'
                }`}
              >
                Contas Bancárias - Saldos
              </h2>
              <button
                type="button"
                onClick={() => setShowAccountsDetails(false)}
                className={`text-sm ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Fechar
              </button>
            </div>

            {accounts.length === 0 ? (
              <p
                className={`text-sm ${
                  isDark ? 'text-slate-300' : 'text-gray-500'
                }`}
              >
                Nenhuma conta bancária cadastrada.
              </p>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account._id}
                    className={`flex items-center justify-between rounded-md px-4 py-2 border ${
                      isDark ? 'border-slate-800' : 'border-gray-100'
                    }`}
                  >
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          isDark ? 'text-slate-100' : 'text-gray-900'
                        }`}
                      >
                        {account.name}
                      </p>
                      <p
                        className={`text-xs ${
                          isDark ? 'text-slate-400' : 'text-gray-500'
                        }`}
                      >
                        {account.bank}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xs ${
                          isDark ? 'text-slate-400' : 'text-gray-500'
                        }`}
                      >
                        Saldo
                      </p>
                      <p
                        className={`text-sm font-semibold ${
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
        <div
          className={`shadow-lg rounded-xl p-6 ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
              : 'bg-white border border-gray-200'
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-slate-100' : 'text-gray-900'
            }`}
          >
            Dívidas do Mês Atual ({formatMonthLabel(currentMonthKey)})
          </h2>
          {currentMonthDebts.length === 0 ? (
            <p
              className={`text-sm ${
                isDark ? 'text-slate-300' : 'text-gray-500'
              }`}
            >
              Não há dívidas cadastradas para o mês atual.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3
                  className={`text-md font-semibold mb-2 ${
                    isDark ? 'text-red-300' : 'text-red-600'
                  }`}
                >
                  Atrasadas
                </h3>
                {currentMonthDebts.filter(isOverdue).length === 0 ? (
                  <p
                    className={`text-sm ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Nenhuma dívida atrasada neste mês.
                  </p>
                ) : (
                  <ul
                    className={`divide-y ${
                      isDark ? 'divide-slate-800' : 'divide-gray-200'
                    }`}
                  >
                    {groupDebtsLikeDebtsPage(
                      currentMonthDebts.filter(isOverdue)
                    ).map((debt) => (
                      <li
                        key={debt._id}
                        className="py-2 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center">
                            <p
                              className={`text-sm font-medium ${
                                isDark ? 'text-slate-100' : 'text-gray-900'
                              }`}
                            >
                              {debt.description}
                            </p>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-800 text-red-100">
                              Vencida
                            </span>
                          </div>
                          <p
                            className={`text-xs ${
                              isDark ? 'text-slate-400' : 'text-gray-500'
                            }`}
                          >
                            Vencimento: {formatDate(debt.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${
                              isDark ? 'text-red-300' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(debt.amount)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3
                  className={`text-md font-semibold mb-2 ${
                    isDark ? 'text-yellow-300' : 'text-yellow-600'
                  }`}
                >
                  Pendentes (a vencer)
                </h3>
                {currentMonthDebts.filter((d) => !isOverdue(d)).length === 0 ? (
                  <p
                    className={`text-sm ${
                      isDark ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    Nenhuma dívida pendente neste mês.
                  </p>
                ) : (
                  <ul
                    className={`divide-y ${
                      isDark ? 'divide-slate-800' : 'divide-gray-200'
                    }`}
                  >
                    {groupDebtsLikeDebtsPage(
                      currentMonthDebts.filter((d) => !isOverdue(d))
                    ).map((debt) => (
                      <li
                        key={debt._id}
                        className="py-2 flex items-center justify-between"
                      >
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              isDark ? 'text-slate-100' : 'text-gray-900'
                            }`}
                          >
                            {debt.description}
                          </p>
                          <p
                            className={`text-xs ${
                              isDark ? 'text-slate-400' : 'text-gray-500'
                            }`}
                          >
                            Vencimento: {formatDate(debt.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${
                              isDark ? 'text-yellow-300' : 'text-yellow-600'
                            }`}
                          >
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
        <div
          className={`shadow-lg rounded-xl p-6 ${
            isDark
              ? 'bg-slate-900/80 border border-white/10 backdrop-blur'
              : 'bg-white border border-gray-200'
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-4 ${
              isDark ? 'text-slate-100' : 'text-gray-900'
            }`}
          >
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dashboard/credit-cards"
              className="flex items-center justify-center px-4 py-2 border border-emerald-500/40 text-sm font-medium rounded-md text-slate-950 bg-emerald-400 hover:bg-emerald-300 hover:border-emerald-400 transition-colors"
            >
              Adicionar Cartão
            </Link>
            <Link
              href="/dashboard/debts"
              className="flex items-center justify-center px-4 py-2 border border-red-500/40 text-sm font-medium rounded-md text-slate-50 bg-red-600/90 hover:bg-red-500 transition-colors"
            >
              Adicionar Dívida
            </Link>
            <Link
              href="/dashboard/categories"
              className="flex items-center justify-center px-4 py-2 border border-emerald-500/40 text-sm font-medium rounded-md text-slate-950 bg-emerald-400 hover:bg-emerald-300 hover:border-emerald-400 transition-colors"
            >
              Gerenciar Categorias
            </Link>
            <Link
              href="/dashboard/accounts"
              className="flex items-center justify-center px-4 py-2 border border-cyan-500/40 text-sm font-medium rounded-md text-slate-950 bg-cyan-400 hover:bg-cyan-300 hover:border-cyan-400 transition-colors"
            >
              Adicionar Conta
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}



















