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

type AccountSummary = {
  _id: string;
  name: string;
  balance: number;
  bank: string;
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
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [showAccountsDetails, setShowAccountsDetails] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [debtsSummaryRes, cardsRes, accountsRes, investmentsRes, debtsRes] =
        await Promise.all([
          api.get<{ summary: { total: number } }>('/debts/summary'),
          api.get<{ creditCards: CreditCardSummary[] }>('/credit-cards'),
          api.get<{ accounts: AccountSummary[] }>('/accounts'),
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
      setAccounts(accountsRes.accounts);
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Visão geral das suas finanças
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-slate-900/80 border border-white/10 overflow-hidden shadow-lg rounded-xl backdrop-blur">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <span className="text-emerald-400 text-xl">💰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-300 truncate">
                    Total de Dívidas
                  </dt>
                  <dd className="text-lg font-semibold text-slate-50">
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
          className="bg-slate-900/80 border border-white/10 overflow-hidden shadow-lg rounded-xl text-left hover:shadow-xl hover:border-emerald-400/60 transition-all backdrop-blur"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center">
                  <span className="text-red-400 text-xl">⏰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-300 truncate">
                    Total Atrasado (todos os meses)
                  </dt>
                  <dd className="text-lg font-semibold text-slate-50">
                    {formatCurrency(totalOverdue)}
                  </dd>
                  <dd className="mt-1 text-xs text-red-300">
                    Clique para ver detalhes por mês
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </button>

        <div className="bg-slate-900/80 border border-white/10 overflow-hidden shadow-lg rounded-xl backdrop-blur">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center">
                  <span className="text-cyan-400 text-xl">📅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-300 truncate">
                    Mês Atual - Resumo
                  </dt>
                  <dd className="mt-1 text-xs text-slate-300">
                    Total: {formatCurrency(currentMonthTotals.total)}
                  </dd>
                  <dd className="mt-1 text-xs text-red-300">
                    Atrasado: {formatCurrency(currentMonthTotals.overdue)}
                  </dd>
                  <dd className="mt-1 text-xs text-yellow-300">
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
          className="bg-slate-900/80 border border-white/10 overflow-hidden shadow-lg rounded-xl text-left hover:shadow-xl hover:border-emerald-400/60 transition-all backdrop-blur"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <span className="text-blue-400 text-xl">💳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-300 truncate">
                    Cartões de Crédito ({stats.totalCreditCards})
                  </dt>
                  <dd className="mt-1 text-xs text-slate-300">
                    Limite total:{' '}
                    <span className="font-semibold text-slate-50">
                      {formatCurrency(totalCardsLimit)}
                    </span>
                  </dd>
                  <dd className="mt-1 text-xs text-emerald-300">
                    Disponível:{' '}
                    <span className="font-semibold">
                      {formatCurrency(totalCardsAvailable)}
                    </span>
                  </dd>
                  <dd className="mt-1 text-[11px] text-blue-300">
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
          className="bg-slate-900/80 border border-white/10 overflow-hidden shadow-lg rounded-xl text-left hover:shadow-xl hover:border-emerald-400/60 transition-all backdrop-blur"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <span className="text-emerald-400 text-xl">🏦</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-300 truncate">
                    Contas Bancárias ({stats.totalAccounts})
                  </dt>
                  <dd className="mt-1 text-xs text-slate-300">
                    Saldo total:{' '}
                    <span className="font-semibold text-slate-50">
                      {formatCurrency(totalAccountsBalance)}
                    </span>
                  </dd>
                  <dd className="mt-1 text-[11px] text-emerald-300">
                    Clique para ver saldo por conta
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </button>

        <div className="bg-slate-900/80 border border-white/10 overflow-hidden shadow-lg rounded-xl backdrop-blur">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
                  <span className="text-yellow-300 text-xl">📈</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-300 truncate">
                    Investimentos
                  </dt>
                  <dd className="text-lg font-semibold text-slate-50">
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
          <div className="bg-slate-900/80 border border-white/10 shadow-lg rounded-xl p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">
                Dívidas em Atraso por Mês
              </h2>
              <button
                type="button"
                onClick={() => setShowOverdueDetails(false)}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Fechar
              </button>
            </div>

            {overdueDebts.length === 0 ? (
              <p className="text-sm text-slate-300">
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
                        <h3 className="text-md font-semibold text-slate-100">
                          {formatMonthLabel(monthKey)}
                        </h3>
                        <span className="text-sm font-medium text-red-300">
                          {formatCurrency(monthTotal)}
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-800">
                        {grouped.map((debt) => (
                          <li
                            key={debt._id}
                            className="py-2 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-slate-100">
                                  {debt.description}
                                </p>
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-800 text-red-100">
                                  Vencida
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Vencimento: {formatDate(debt.dueDate)}
                              </p>
                              {debt.categoryId && (
                                <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-100">
                                  {debt.categoryId.name}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-red-300">
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
          <div className="bg-slate-900/80 border border-white/10 shadow-lg rounded-xl p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">
                Cartões de Crédito - Limites
              </h2>
              <button
                type="button"
                onClick={() => setShowCardsDetails(false)}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Fechar
              </button>
            </div>

            {creditCards.length === 0 ? (
              <p className="text-sm text-slate-300">
                Nenhum cartão de crédito cadastrado.
              </p>
            ) : (
              <div className="space-y-3">
                {creditCards.map((card) => (
                  <div
                    key={card._id}
                    className="flex items-center justify-between border border-slate-800 rounded-md px-4 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {card.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Limite:{' '}
                        <span className="font-semibold text-slate-50">
                          {formatCurrency(card.limit)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Disponível</p>
                      <p className="text-sm font-semibold text-emerald-300">
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
          <div className="bg-slate-900/80 border border-white/10 shadow-lg rounded-xl p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">
                Contas Bancárias - Saldos
              </h2>
              <button
                type="button"
                onClick={() => setShowAccountsDetails(false)}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Fechar
              </button>
            </div>

            {accounts.length === 0 ? (
              <p className="text-sm text-slate-300">
                Nenhuma conta bancária cadastrada.
              </p>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account._id}
                    className="flex items-center justify-between border border-slate-800 rounded-md px-4 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {account.name}
                      </p>
                      <p className="text-xs text-slate-400">{account.bank}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Saldo</p>
                      <p
                        className={`text-sm font-semibold ${
                          account.balance >= 0
                            ? 'text-emerald-300'
                            : 'text-red-300'
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
        <div className="bg-slate-900/80 border border-white/10 shadow-lg rounded-xl p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            Dívidas do Mês Atual ({formatMonthLabel(currentMonthKey)})
          </h2>
          {currentMonthDebts.length === 0 ? (
            <p className="text-sm text-slate-300">
              Não há dívidas cadastradas para o mês atual.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-semibold text-red-300 mb-2">
                  Atrasadas
                </h3>
                {currentMonthDebts.filter(isOverdue).length === 0 ? (
                  <p className="text-sm text-slate-300">
                    Nenhuma dívida atrasada neste mês.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {groupDebtsLikeDebtsPage(
                      currentMonthDebts.filter(isOverdue)
                    ).map((debt) => (
                      <li
                        key={debt._id}
                        className="py-2 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-slate-100">
                              {debt.description}
                            </p>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-800 text-red-100">
                              Vencida
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Vencimento: {formatDate(debt.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-300">
                            {formatCurrency(debt.amount)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-md font-semibold text-yellow-300 mb-2">
                  Pendentes (a vencer)
                </h3>
                {currentMonthDebts.filter((d) => !isOverdue(d)).length === 0 ? (
                  <p className="text-sm text-slate-300">
                    Nenhuma dívida pendente neste mês.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {groupDebtsLikeDebtsPage(
                      currentMonthDebts.filter((d) => !isOverdue(d))
                    ).map((debt) => (
                      <li
                        key={debt._id}
                        className="py-2 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-100">
                            {debt.description}
                          </p>
                          <p className="text-xs text-slate-400">
                            Vencimento: {formatDate(debt.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-yellow-300">
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
        <div className="bg-slate-900/80 border border-white/10 shadow-lg rounded-xl p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
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



















