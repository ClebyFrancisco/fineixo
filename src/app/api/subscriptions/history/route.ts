import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SubscriptionHistory from '@/models/SubscriptionHistory';
import { authenticateRequest } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const history = await SubscriptionHistory.find({
      userId: authResult.user.userId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Get subscription history error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de assinaturas' },
      { status: 500 }
    );
  }
}


