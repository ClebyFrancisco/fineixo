import { Types } from 'mongoose';

export interface User {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  stripeCustomerId?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCard {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  limit: number;
  availableLimit: number;
  bestPurchaseDay: number; // 1-31
  dueDate: number; // Dia de vencimento (1-31)
  accountId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  bank: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Investment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  type: string;
  value: number;
  accountId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type DebtType = 'single' | 'monthly' | 'installment';

export interface Debt {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  description: string;
  amount: number;
  type: DebtType;
  categoryId?: Types.ObjectId;
  creditCardId?: Types.ObjectId;
  accountId?: Types.ObjectId;
  dueDate: Date;
  purchaseDate?: Date; // Data de compra (para compras no cartão)
  paid: boolean;
  paidAt?: Date;
  // Para dívidas parceladas
  installments?: {
    current: number;
    total: number;
  };
  // Para dívidas mensais de cartão
  month?: string; // YYYY-MM
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
}







