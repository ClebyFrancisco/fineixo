import mongoose, { Schema } from 'mongoose';
import { Investment as IInvestment } from '@/types';

const InvestmentSchema = new Schema<IInvestment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Nome do investimento é obrigatório'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Tipo do investimento é obrigatório'],
      trim: true,
    },
    value: {
      type: Number,
      required: [true, 'Valor é obrigatório'],
      min: [0, 'Valor não pode ser negativo'],
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

InvestmentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Investment || mongoose.model<IInvestment>('Investment', InvestmentSchema);
















