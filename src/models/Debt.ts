import mongoose, { Schema } from 'mongoose';
import { Debt as IDebt } from '@/types';

const DebtSchema = new Schema<IDebt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Valor é obrigatório'],
      min: [0, 'Valor não pode ser negativo'],
    },
    type: {
      type: String,
      enum: ['single', 'monthly', 'installment'],
      required: [true, 'Tipo da dívida é obrigatório'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    creditCardId: {
      type: Schema.Types.ObjectId,
      ref: 'CreditCard',
      default: null,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    dueDate: {
      type: Date,
      required: [true, 'Data de vencimento é obrigatória'],
    },
    purchaseDate: {
      type: Date,
      default: null,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    installments: {
      current: {
        type: Number,
        min: [1, 'Parcela atual deve ser pelo menos 1'],
      },
      total: {
        type: Number,
        min: [1, 'Total de parcelas deve ser pelo menos 1'],
      },
    },
    month: {
      type: String,
      match: [/^\d{4}-\d{2}$/, 'Mês deve estar no formato YYYY-MM'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
DebtSchema.index({ userId: 1, dueDate: 1 });
DebtSchema.index({ userId: 1, creditCardId: 1, month: 1 });
DebtSchema.index({ userId: 1, paid: 1 });
DebtSchema.index({ userId: 1, categoryId: 1 });

export default mongoose.models.Debt || mongoose.model<IDebt>('Debt', DebtSchema);











