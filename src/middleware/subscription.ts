import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Subscription from '@/models/Subscription';
import { authenticateRequest } from './auth';

export async function requireSubscription(
  request: NextRequest
): Promise<{ user: any; subscription: any } | { error: NextResponse }> {
  // First authenticate the user
  const authResult = await authenticateRequest(request);
  if ('error' in authResult) {
    return authResult;
  }

  await connectDB();

  // Check if user has an active subscription
  const subscription = await Subscription.findOne({
    userId: authResult.user.userId,
    status: 'active',
    currentPeriodEnd: { $gt: new Date() },
  });

  if (!subscription) {
    return {
      error: NextResponse.json(
        { error: 'Assinatura ativa necessária para realizar esta ação' },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user, subscription };
}

export async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  await connectDB();
  
  const subscription = await Subscription.findOne({
    userId,
    status: 'active',
    currentPeriodEnd: { $gt: new Date() },
  });

  return !!subscription;
}


