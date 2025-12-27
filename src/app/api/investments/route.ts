import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Investment from '@/models/Investment';
import { authenticateRequest } from '@/middleware/auth';
import { z } from 'zod';

const investmentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  value: z.number().min(0, 'Valor deve ser positivo'),
  accountId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const investments = await Investment.find({
      userId: authResult.user.userId,
    }).sort({ createdAt: -1 });

    return NextResponse.json({ investments });
  } catch (error) {
    console.error('Get investments error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar investimentos' },
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
    const validatedData = investmentSchema.parse(body);

    const investment = await Investment.create({
      ...validatedData,
      userId: authResult.user.userId,
    });

    return NextResponse.json(
      { investment, message: 'Investimento criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create investment error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar investimento' },
      { status: 500 }
    );
  }
}
















