import mongoose, { Schema } from 'mongoose';
import { Account as IAccount } from '@/types';

const AccountSchema = new Schema<IAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Nome da conta é obrigatório'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['checking', 'savings', 'investment'],
      required: [true, 'Tipo da conta é obrigatório'],
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    bank: {
      type: String,
      required: [true, 'Banco é obrigatório'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

AccountSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);



















