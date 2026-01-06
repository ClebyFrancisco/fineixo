import mongoose, { Schema } from 'mongoose';

export interface ITransaction {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId?: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  walletId?: mongoose.Types.ObjectId;
  creditCardId?: mongoose.Types.ObjectId;
  debtId?: mongoose.Types.ObjectId;
  date: Date;
  month: string; // YYYY-MM
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Valor deve ser positivo'],
    },
    description: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      default: null,
    },
    creditCardId: {
      type: Schema.Types.ObjectId,
      ref: 'CreditCard',
      default: null,
    },
    debtId: {
      type: Schema.Types.ObjectId,
      ref: 'Debt',
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'Mês deve estar no formato YYYY-MM'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TransactionSchema.index({ userId: 1, month: 1 });
TransactionSchema.index({ userId: 1, accountId: 1, month: 1 });
TransactionSchema.index({ userId: 1, creditCardId: 1, month: 1 });
TransactionSchema.index({ userId: 1, walletId: 1, month: 1 });

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
















