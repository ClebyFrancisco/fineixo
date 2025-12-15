import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CreditCard from '@/models/CreditCard';
import Debt from '@/models/Debt';
import { authenticateRequest } from '@/middleware/auth';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  limit: z.number().min(0).optional(),
  bestPurchaseDay: z.number().min(1).max(31).optional(),
  dueDate: z.number().min(1).max(31).optional(),
  accountId: z.string().optional(),
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

    const creditCard = await CreditCard.findOne({
      _id: params.id,
      userId: authResult.user.userId,
    });

    if (!creditCard) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ creditCard });
  } catch (error) {
    console.error('Get credit card error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cartão' },
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

    // Garantir que dueDate seja sempre atualizado se fornecido
    const updateData: any = { ...validatedData };
    
    const creditCard = await CreditCard.findOneAndUpdate(
      { _id: params.id, userId: authResult.user.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!creditCard) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      creditCard,
      message: 'Cartão atualizado com sucesso',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update credit card error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cartão' },
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

    const creditCard = await CreditCard.findOne({
      _id: params.id,
      userId: authResult.user.userId,
    });

    if (!creditCard) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      );
    }

    // Excluir todas as dívidas/compras associadas ao cartão
    const deletedDebts = await Debt.deleteMany({
      creditCardId: params.id,
      userId: authResult.user.userId,
    });

    // Excluir o cartão
    await CreditCard.findByIdAndDelete(params.id);

    return NextResponse.json({ 
      message: 'Cartão removido com sucesso',
      deletedDebtsCount: deletedDebts.deletedCount 
    });
  } catch (error) {
    console.error('Delete credit card error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover cartão' },
      { status: 500 }
    );
  }
}







