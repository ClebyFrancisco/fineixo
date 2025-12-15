import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Debt from '@/models/Debt';
import { authenticateRequest } from '@/middleware/auth';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const creditCardId = searchParams.get('creditCardId');
    const month = searchParams.get('month');

    const query: any = { 
      userId: new mongoose.Types.ObjectId(authResult.user.userId), 
      paid: false 
    };

    if (creditCardId) {
      query.creditCardId = new mongoose.Types.ObjectId(creditCardId);
    }

    if (month) {
      query.month = month;
    }

    // Total de dívidas não pagas
    const totalDebts = await Debt.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Dívidas por cartão e mês
    const debtsByCardAndMonth = await Debt.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(authResult.user.userId),
          paid: false,
          creditCardId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            creditCardId: '$creditCardId',
            month: '$month',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'creditcards',
          localField: '_id.creditCardId',
          foreignField: '_id',
          as: 'creditCard',
        },
      },
      {
        $unwind: {
          path: '$creditCard',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    return NextResponse.json({
      summary: {
        total: totalDebts[0]?.total || 0,
        count: totalDebts[0]?.count || 0,
      },
      byCardAndMonth: debtsByCardAndMonth,
    });
  } catch (error) {
    console.error('Get debts summary error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar resumo de dívidas' },
      { status: 500 }
    );
  }
}



