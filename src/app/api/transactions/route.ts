import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Account from '@/models/Account';
import Wallet from '@/models/Wallet';
import { authenticateRequest } from '@/middleware/auth';
import { requireSubscription } from '@/middleware/subscription';
import { z } from 'zod';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().min(0, 'Valor deve ser positivo'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  walletId: z.string().optional(),
  creditCardId: z.string().optional(),
  debtId: z.string().optional(),
  date: z.string().or(z.date()),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const accountId = searchParams.get('accountId');
    const creditCardId = searchParams.get('creditCardId');
    const walletId = searchParams.get('walletId');
    const debtId = searchParams.get('debtId');

    const query: any = { userId: authResult.user.userId };

    if (month) {
      query.month = month;
    } else {
      // Se não especificar mês, usa o mês atual
      const now = new Date();
      query.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    if (accountId) {
      query.accountId = accountId;
    }

    if (creditCardId) {
      query.creditCardId = creditCardId;
    }

    if (walletId && walletId !== 'wallet') {
      query.walletId = walletId;
    } else if (walletId === 'wallet') {
      query.walletId = { $exists: true, $ne: null };
    }

    if (debtId) {
      query.debtId = debtId;
    }

    const transactions = await Transaction.find(query)
      .populate('categoryId', 'name color')
      .populate('accountId', 'name bank')
      .populate('walletId', 'name')
      .populate('creditCardId', 'name')
      .populate('debtId', 'description amount')
      .sort({ date: -1 });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar transações' },
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
    const validatedData = transactionSchema.parse(body);

    // Se não especificar conta nem carteira, vai para carteira
    let walletId = validatedData.walletId;
    if (!validatedData.accountId && !validatedData.walletId) {
      // Buscar ou criar carteira padrão
      const Wallet = (await import('@/models/Wallet')).default;
      let wallet = await Wallet.findOne({
        userId: subscriptionResult.user.userId,
        name: 'Carteira Principal',
      });

      if (!wallet) {
        wallet = await Wallet.create({
          userId: subscriptionResult.user.userId,
          name: 'Carteira Principal',
          balance: 0,
        });
      }
      walletId = wallet._id.toString();
    }

    const transaction = await Transaction.create({
      ...validatedData,
      userId: subscriptionResult.user.userId,
      walletId: walletId || validatedData.walletId,
      date: new Date(validatedData.date),
    });

    // Atualizar saldo da conta ou carteira
    if (validatedData.accountId) {
      const account = await Account.findById(validatedData.accountId);
      if (account) {
        if (validatedData.type === 'income') {
          account.balance += validatedData.amount;
        } else {
          account.balance -= validatedData.amount;
        }
        await account.save();
      }
    } else if (walletId) {
      const Wallet = (await import('@/models/Wallet')).default;
      const wallet = await Wallet.findById(walletId);
      if (wallet) {
        if (validatedData.type === 'income') {
          wallet.balance += validatedData.amount;
        } else {
          wallet.balance -= validatedData.amount;
        }
        await wallet.save();
      }
    }

    return NextResponse.json(
      { transaction, message: 'Transação criada com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar transação' },
      { status: 500 }
    );
  }
}

