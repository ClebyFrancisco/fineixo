import mongoose, { Schema } from 'mongoose';
import { Wallet as IWallet } from '@/types';

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Nome da carteira é obrigatório'],
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

WalletSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);













