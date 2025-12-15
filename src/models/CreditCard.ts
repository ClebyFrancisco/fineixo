import mongoose, { Schema, Model } from 'mongoose';
import { CreditCard as ICreditCard } from '@/types';

const CreditCardSchema = new Schema<ICreditCard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Nome do cartão é obrigatório'],
      trim: true,
    },
    limit: {
      type: Number,
      required: [true, 'Limite é obrigatório'],
      min: [0, 'Limite não pode ser negativo'],
    },
    availableLimit: {
      type: Number,
      required: true,
      default: function (this: ICreditCard) {
        return this.limit;
      },
    },
    bestPurchaseDay: {
      type: Number,
      required: true,
      min: [1, 'Dia deve ser entre 1 e 31'],
      max: [31, 'Dia deve ser entre 1 e 31'],
      default: 1,
    },
    dueDate: {
      type: Number,
      required: true,
      min: [1, 'Dia de vencimento deve ser entre 1 e 31'],
      max: [31, 'Dia de vencimento deve ser entre 1 e 31'],
      default: 10,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
CreditCardSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.CreditCard || mongoose.model<ICreditCard>('CreditCard', CreditCardSchema);







