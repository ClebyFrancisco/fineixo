import mongoose, { Schema, Model } from 'mongoose';
import { Types } from 'mongoose';

export interface ISubscriptionHistory {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  stripeEventId: string;
  stripeEventType: string;
  plan: 'monthly' | 'semiannual' | 'annual';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired';
  amount: number;
  currency: string;
  description?: string;
  createdAt: Date;
}

const SubscriptionHistorySchema = new Schema<ISubscriptionHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    stripeEventId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeEventType: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      enum: ['monthly', 'semiannual', 'annual'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'brl',
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
SubscriptionHistorySchema.index({ userId: 1 });
SubscriptionHistorySchema.index({ stripeEventId: 1 });
SubscriptionHistorySchema.index({ createdAt: -1 });

export default mongoose.models.SubscriptionHistory || mongoose.model<ISubscriptionHistory>('SubscriptionHistory', SubscriptionHistorySchema);



