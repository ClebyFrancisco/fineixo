import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { authenticateRequest } from '@/middleware/auth';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida').optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const categories = await Category.find({
      userId: authResult.user.userId,
    }).sort({ name: 1 });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar categorias' },
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
    const validatedData = categorySchema.parse(body);

    const category = await Category.create({
      ...validatedData,
      userId: authResult.user.userId,
    });

    return NextResponse.json(
      { category, message: 'Categoria criada com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar categoria' },
      { status: 500 }
    );
  }
}
















