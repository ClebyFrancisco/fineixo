import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import { authenticateRequest } from '@/middleware/auth';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  balance: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const wallet = await Wallet.findOne({
      _id: params.id,
      userId: authResult.user.userId,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Carteira não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ wallet });
  } catch (error) {
    console.error('Get wallet error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar carteira' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    const wallet = await Wallet.findOneAndUpdate(
      { _id: params.id, userId: authResult.user.userId },
      validatedData,
      { new: true, runValidators: true }
    );

    if (!wallet) {
      return NextResponse.json(
        { error: 'Carteira não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      wallet,
      message: 'Carteira atualizada com sucesso',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update wallet error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar carteira' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const wallet = await Wallet.findOneAndDelete({
      _id: params.id,
      userId: authResult.user.userId,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Carteira não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Carteira removida com sucesso' });
  } catch (error) {
    console.error('Delete wallet error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover carteira' },
      { status: 500 }
    );
  }
}
















