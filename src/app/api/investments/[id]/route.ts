import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Investment from '@/models/Investment';
import { authenticateRequest } from '@/middleware/auth';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  value: z.number().min(0).optional(),
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

    const investment = await Investment.findOne({
      _id: params.id,
      userId: authResult.user.userId,
    });

    if (!investment) {
      return NextResponse.json(
        { error: 'Investimento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ investment });
  } catch (error) {
    console.error('Get investment error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar investimento' },
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

    const investment = await Investment.findOneAndUpdate(
      { _id: params.id, userId: authResult.user.userId },
      validatedData,
      { new: true, runValidators: true }
    );

    if (!investment) {
      return NextResponse.json(
        { error: 'Investimento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      investment,
      message: 'Investimento atualizado com sucesso',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update investment error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar investimento' },
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

    const investment = await Investment.findOneAndDelete({
      _id: params.id,
      userId: authResult.user.userId,
    });

    if (!investment) {
      return NextResponse.json(
        { error: 'Investimento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Investimento removido com sucesso' });
  } catch (error) {
    console.error('Delete investment error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover investimento' },
      { status: 500 }
    );
  }
}














