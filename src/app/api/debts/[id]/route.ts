import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Debt from '@/models/Debt';
import CreditCard from '@/models/CreditCard';
import { authenticateRequest } from '@/middleware/auth';
import { z } from 'zod';

const updateSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  type: z.enum(['single', 'monthly', 'installment']).optional(),
  categoryId: z.string().optional(),
  creditCardId: z.string().optional(),
  accountId: z.string().optional(),
  dueDate: z.string().or(z.date()).optional(),
  paid: z.boolean().optional(),
  paidAt: z.string().or(z.date()).optional(),
  installments: z
    .object({
      current: z.number().min(1),
      total: z.number().min(1),
    })
    .optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
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

    const debt = await Debt.findOne({
      _id: params.id,
      userId: authResult.user.userId,
    })
      .populate('categoryId', 'name color')
      .populate('creditCardId', 'name')
      .populate('accountId', 'name');

    if (!debt) {
      return NextResponse.json(
        { error: 'Dívida não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ debt });
  } catch (error) {
    console.error('Get debt error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dívida' },
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

    const updateData: any = { ...validatedData };
    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }
    if (validatedData.paidAt) {
      updateData.paidAt = new Date(validatedData.paidAt);
    }
    if (validatedData.paid === true && !updateData.paidAt) {
      updateData.paidAt = new Date();
    }

    const debt = await Debt.findOneAndUpdate(
      { _id: params.id, userId: authResult.user.userId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('categoryId', 'name color')
      .populate('creditCardId', 'name')
      .populate('accountId', 'name');

    if (!debt) {
      return NextResponse.json(
        { error: 'Dívida não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      debt,
      message: 'Dívida atualizada com sucesso',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update debt error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar dívida' },
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

    const debt = await Debt.findOne({
      _id: params.id,
      userId: authResult.user.userId,
    });

    if (!debt) {
      return NextResponse.json(
        { error: 'Dívida não encontrada' },
        { status: 404 }
      );
    }

    // Se for uma compra de cartão de crédito não paga, restaurar o limite disponível
    if (debt.creditCardId && !debt.paid) {
      const creditCard = await CreditCard.findOne({
        _id: debt.creditCardId,
        userId: authResult.user.userId,
      });

      if (creditCard) {
        creditCard.availableLimit += debt.amount;
        // Garantir que o limite disponível não ultrapasse o limite total
        if (creditCard.availableLimit > creditCard.limit) {
          creditCard.availableLimit = creditCard.limit;
        }
        await creditCard.save();
      }
    }

    await Debt.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Dívida removida com sucesso' });
  } catch (error) {
    console.error('Delete debt error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover dívida' },
      { status: 500 }
    );
  }
}







