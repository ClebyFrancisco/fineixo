import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import { authenticateRequest } from '@/middleware/auth';
import { z } from 'zod';

const walletSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  balance: z.number().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const wallets = await Wallet.find({
      userId: authResult.user.userId,
    }).sort({ createdAt: -1 });

    return NextResponse.json({ wallets });
  } catch (error) {
    console.error('Get wallets error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar carteiras' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const body = await request.json();
    const validatedData = walletSchema.parse(body);

    const wallet = await Wallet.create({
      ...validatedData,
      userId: authResult.user.userId,
    });

    return NextResponse.json(
      { wallet, message: 'Carteira criada com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create wallet error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar carteira' },
      { status: 500 }
    );
  }
}















