'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from 'react';
import { api } from '@/services/api';

type Debt = {
  _id: string;
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  categoryId?: { name: string; color?: string };
  creditCardId?: { name: string };
  installments?: { current: number; total: number };
  totalPaid?: number;
};

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

type InvestmentSummary = {
  _id: string;
};

interface DashboardData {
  stats: {
    totalDebts: number;
    totalCreditCards: number;
    totalAccounts: number;
    totalInvestments: number;
  };
  debts: Debt[];
  creditCards: CreditCardSummary[];
  accounts: AccountSummary[];
  investments: InvestmentSummary[];
}

interface DashboardSlice {
  data: DashboardData | null;
  loading: boolean;
  initialized: boolean;
  load: (force?: boolean) => Promise<void>;
}

interface DebtsSlice {
  debts: Debt[];
  loading: boolean;
  initialized: boolean;
  load: (force?: boolean) => Promise<void>;
}

interface FinanceDataContextType {
  dashboard: DashboardSlice;
  debts: DebtsSlice;
}

const FinanceDataContext = createContext<FinanceDataContextType | undefined>(
  undefined,
);

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  // Dashboard
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardInitialized, setDashboardInitialized] = useState(false);

  const loadDashboard = useCallback(
    async (force: boolean = false) => {
      if (dashboardLoading) return;
      if (dashboardInitialized && !force) return;

      setDashboardLoading(true);
      try {
        const [
          debtsSummaryRes,
          cardsRes,
          accountsRes,
          investmentsRes,
          debtsRes,
        ] = await Promise.all([
          api.get<{ summary: { total: number } }>('/debts/summary'),
          api.get<{ creditCards: CreditCardSummary[] }>('/credit-cards'),
          api.get<{ accounts: AccountSummary[] }>('/accounts'),
          api.get<{ investments: InvestmentSummary[] }>('/investments'),
          api.get<{ debts: Debt[] }>('/debts?paid=false'),
        ]);

        setDashboardData({
          stats: {
            totalDebts: debtsSummaryRes.summary.total,
            totalCreditCards: cardsRes.creditCards.length,
            totalAccounts: accountsRes.accounts.length,
            totalInvestments: investmentsRes.investments.length,
          },
          debts: debtsRes.debts,
          creditCards: cardsRes.creditCards,
          accounts: accountsRes.accounts,
          investments: investmentsRes.investments,
        });
        setDashboardInitialized(true);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setDashboardLoading(false);
      }
    },
    [dashboardInitialized, dashboardLoading],
  );

  // Debts (lista completa, incluindo total pago)
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [debtsInitialized, setDebtsInitialized] = useState(false);

  const loadDebts = useCallback(
    async (force: boolean = false) => {
      if (debtsLoading) return;
      if (debtsInitialized && !force) return;

      setDebtsLoading(true);
      try {
        const data = await api.get<{ debts: Debt[] }>('/debts');

        // Buscar total pago para cada dívida (mantém comportamento atual)
        const debtsWithPayments = await Promise.all(
          data.debts.map(async (debt) => {
            try {
              const payments = await api.get<{
                transactions: Array<{ amount: number }>;
              }>(`/transactions?debtId=${debt._id}`);
              const totalPaid = payments.transactions.reduce(
                (sum, t) => sum + t.amount,
                0,
              );
              return { ...debt, totalPaid };
            } catch {
              return { ...debt, totalPaid: 0 };
            }
          }),
        );

        setDebts(debtsWithPayments);
        setDebtsInitialized(true);
      } catch (error) {
        console.error('Error loading debts:', error);
      } finally {
        setDebtsLoading(false);
      }
    },
    [debtsInitialized, debtsLoading],
  );

  return (
    <FinanceDataContext.Provider
      value={{
        dashboard: {
          data: dashboardData,
          loading: dashboardLoading,
          initialized: dashboardInitialized,
          load: loadDashboard,
        },
        debts: {
          debts,
          loading: debtsLoading,
          initialized: debtsInitialized,
          load: loadDebts,
        },
      }}
    >
      {children}
    </FinanceDataContext.Provider>
  );
}

export function useFinanceData() {
  const ctx = useContext(FinanceDataContext);
  if (!ctx) {
    throw new Error('useFinanceData must be used within a FinanceDataProvider');
  }
  return ctx;
}


