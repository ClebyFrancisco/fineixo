'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { api } from '@/services/api';

export type Debt = {
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

export type CreditCardSummary = {
  _id: string;
  name: string;
  limit: number;
  availableLimit: number;
};

export type AccountSummary = {
  _id: string;
  name: string;
  balance: number;
  bank: string;
};

export type InvestmentSummary = {
  _id: string;
};

export type Wallet = {
  _id: string;
  name: string;
  balance: number;
};

export interface DashboardData {
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

interface FinanceDataContextType {
  dashboardData: DashboardData | null;
  dashboardLoading: boolean;
  loadDashboard: (force?: boolean) => Promise<void>;

  accounts: AccountSummary[];
  accountsLoading: boolean;
  loadAccounts: (force?: boolean) => Promise<void>;

  creditCards: CreditCardSummary[];
  creditCardsLoading: boolean;
  loadCreditCards: (force?: boolean) => Promise<void>;

  wallet: Wallet | null;
  walletLoading: boolean;
  loadWallet: (force?: boolean) => Promise<void>;

  invalidate: (...keys: Array<'dashboard' | 'accounts' | 'creditCards' | 'wallet'>) => void;
  refreshAll: () => Promise<void>;
}

const FinanceDataContext = createContext<FinanceDataContextType | undefined>(
  undefined,
);

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  // ── Dashboard ──
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const dashboardInitRef = useRef(false);
  const dashboardInflightRef = useRef<Promise<void> | null>(null);

  // ── Accounts ──
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const accountsInitRef = useRef(false);
  const accountsInflightRef = useRef<Promise<void> | null>(null);

  // ── Credit Cards ──
  const [creditCards, setCreditCards] = useState<CreditCardSummary[]>([]);
  const [creditCardsLoading, setCreditCardsLoading] = useState(false);
  const creditCardsInitRef = useRef(false);
  const creditCardsInflightRef = useRef<Promise<void> | null>(null);

  // ── Wallet ──
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const walletInitRef = useRef(false);
  const walletInflightRef = useRef<Promise<void> | null>(null);

  const loadDashboard = useCallback(async (force = false) => {
    if (!force && dashboardInitRef.current) return;
    if (dashboardInflightRef.current) return dashboardInflightRef.current;

    const promise = (async () => {
      setDashboardLoading(true);
      try {
        const [summaryRes, cardsRes, accountsRes, investmentsRes, debtsRes] =
          await Promise.all([
            api.get<{ summary: { total: number } }>('/debts/summary'),
            api.get<{ creditCards: CreditCardSummary[] }>('/credit-cards'),
            api.get<{ accounts: AccountSummary[] }>('/accounts'),
            api.get<{ investments: InvestmentSummary[] }>('/investments'),
            api.get<{ debts: Debt[] }>('/debts?paid=false'),
          ]);

        setDashboardData({
          stats: {
            totalDebts: summaryRes.summary.total,
            totalCreditCards: cardsRes.creditCards.length,
            totalAccounts: accountsRes.accounts.length,
            totalInvestments: investmentsRes.investments.length,
          },
          debts: debtsRes.debts,
          creditCards: cardsRes.creditCards,
          accounts: accountsRes.accounts,
          investments: investmentsRes.investments,
        });
        dashboardInitRef.current = true;

        // Populate shared caches so other pages skip their own fetch
        setAccounts(accountsRes.accounts);
        accountsInitRef.current = true;
        setCreditCards(cardsRes.creditCards);
        creditCardsInitRef.current = true;
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setDashboardLoading(false);
        dashboardInflightRef.current = null;
      }
    })();

    dashboardInflightRef.current = promise;
    return promise;
  }, []);

  const loadAccounts = useCallback(async (force = false) => {
    if (!force && accountsInitRef.current) return;
    if (accountsInflightRef.current) return accountsInflightRef.current;

    const promise = (async () => {
      setAccountsLoading(true);
      try {
        const data = await api.get<{ accounts: AccountSummary[] }>('/accounts');
        setAccounts(data.accounts);
        accountsInitRef.current = true;
      } catch (error) {
        console.error('Error loading accounts:', error);
      } finally {
        setAccountsLoading(false);
        accountsInflightRef.current = null;
      }
    })();

    accountsInflightRef.current = promise;
    return promise;
  }, []);

  const loadCreditCards = useCallback(async (force = false) => {
    if (!force && creditCardsInitRef.current) return;
    if (creditCardsInflightRef.current) return creditCardsInflightRef.current;

    const promise = (async () => {
      setCreditCardsLoading(true);
      try {
        const data = await api.get<{ creditCards: CreditCardSummary[] }>('/credit-cards');
        setCreditCards(data.creditCards);
        creditCardsInitRef.current = true;
      } catch (error) {
        console.error('Error loading credit cards:', error);
      } finally {
        setCreditCardsLoading(false);
        creditCardsInflightRef.current = null;
      }
    })();

    creditCardsInflightRef.current = promise;
    return promise;
  }, []);

  const loadWallet = useCallback(async (force = false) => {
    if (!force && walletInitRef.current) return;
    if (walletInflightRef.current) return walletInflightRef.current;

    const promise = (async () => {
      setWalletLoading(true);
      try {
        const data = await api.get<{ wallets: Wallet[] }>('/wallets');
        let mainWallet = data.wallets.find((w) => w.name === 'Carteira Principal');
        if (!mainWallet && data.wallets.length > 0) {
          mainWallet = data.wallets[0];
        }
        if (!mainWallet) {
          const created = await api.post<{ wallet: Wallet }>('/wallets', {
            name: 'Carteira Principal',
            balance: 0,
          });
          setWallet(created.wallet);
        } else {
          setWallet(mainWallet);
        }
        walletInitRef.current = true;
      } catch (error) {
        console.error('Error loading wallet:', error);
      } finally {
        setWalletLoading(false);
        walletInflightRef.current = null;
      }
    })();

    walletInflightRef.current = promise;
    return promise;
  }, []);

  const invalidate = useCallback(
    (...keys: Array<'dashboard' | 'accounts' | 'creditCards' | 'wallet'>) => {
      const all = keys.length === 0;
      if (all || keys.includes('dashboard')) dashboardInitRef.current = false;
      if (all || keys.includes('accounts')) accountsInitRef.current = false;
      if (all || keys.includes('creditCards')) creditCardsInitRef.current = false;
      if (all || keys.includes('wallet')) walletInitRef.current = false;
    },
    [],
  );

  const refreshAll = useCallback(async () => {
    invalidate();
    await Promise.all([loadDashboard(true), loadWallet(true)]);
  }, [invalidate, loadDashboard, loadWallet]);

  return (
    <FinanceDataContext.Provider
      value={{
        dashboardData,
        dashboardLoading,
        loadDashboard,
        accounts,
        accountsLoading,
        loadAccounts,
        creditCards,
        creditCardsLoading,
        loadCreditCards,
        wallet,
        walletLoading,
        loadWallet,
        invalidate,
        refreshAll,
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
