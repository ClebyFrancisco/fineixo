import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CreditCard from '@/models/CreditCard';
import { authenticateRequest } from '@/middleware/auth';
import { requireSubscription } from '@/middleware/subscription';
import { z } from 'zod';

const creditCardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  limit: z.number().min(0, 'Limite deve ser positivo'),
  bestPurchaseDay: z.number().min(1).max(31),
  dueDate: z.number().min(1).max(31),
  accountId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const creditCards = await CreditCard.find({
      userId: authResult.user.userId,
    }).sort({ createdAt: -1 });

    return NextResponse.json({ creditCards });
  } catch (error) {
    console.error('Get credit cards error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cartões' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const subscriptionResult = await requireSubscription(request);
    if ('error' in subscriptionResult) {
      return subscriptionResult.error;
    }

    await connectDB();

    const body = await request.json();
    const validatedData = creditCardSchema.parse(body);

    const creditCard = await CreditCard.create({
      ...validatedData,
      userId: subscriptionResult.user.userId,
      availableLimit: validatedData.limit,
    });

    return NextResponse.json(
      { creditCard, message: 'Cartão criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create credit card error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cartão' },
      { status: 500 }
    );
  }
}







