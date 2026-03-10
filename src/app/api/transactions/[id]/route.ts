import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Account from '@/models/Account';
import Wallet from '@/models/Wallet';
import { authenticateRequest } from '@/middleware/auth';
import { requireSubscription } from '@/middleware/subscription';
import { z } from 'zod';

const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  amount: z.number().min(0, 'Valor deve ser positivo').optional(),
  description: z.string().min(1, 'Descrição é obrigatória').optional(),
  categoryId: z.string().optional().nullable(),
  date: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subscriptionResult = await requireSubscription(request);
    if ('error' in subscriptionResult) {
      return subscriptionResult.error;
    }

    await connectDB();

    const body = await request.json();
    const validatedData = updateTransactionSchema.parse(body);

    const transaction = await Transaction.findOne({
      _id: params.id,
      userId: subscriptionResult.user.userId,
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      );
    }

    const oldType = transaction.type;
    const oldAmount = transaction.amount;

    // Reverter saldo antigo
    if (transaction.accountId) {
      const account = await Account.findById(transaction.accountId);
      if (account) {
        if (oldType === 'income') {
          account.balance -= oldAmount;
        } else {
          account.balance += oldAmount;
        }
        await account.save();
      }
    } else if (transaction.walletId) {
      const wallet = await Wallet.findById(transaction.walletId);
      if (wallet) {
        if (oldType === 'income') {
          wallet.balance -= oldAmount;
        } else {
          wallet.balance += oldAmount;
        }
        await wallet.save();
      }
    }

    const newType = validatedData.type ?? oldType;
    const newAmount = validatedData.amount ?? oldAmount;
    const newDate = validatedData.date ? new Date(validatedData.date) : transaction.date;
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;

    const updateData: Record<string, unknown> = {
      type: newType,
      amount: newAmount,
      description: validatedData.description ?? transaction.description,
      categoryId: validatedData.categoryId !== undefined ? validatedData.categoryId || null : transaction.categoryId,
      date: newDate,
      month: newMonth,
    };

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true }
    )
      .populate('categoryId', 'name color')
      .populate('accountId', 'name bank')
      .populate('walletId', 'name')
      .populate('creditCardId', 'name')
      .populate('debtId', 'description amount');

    // Aplicar novo saldo
    if (transaction.accountId) {
      const account = await Account.findById(transaction.accountId);
      if (account) {
        if (newType === 'income') {
          account.balance += newAmount;
        } else {
          account.balance -= newAmount;
        }
        await account.save();
      }
    } else if (transaction.walletId) {
      const wallet = await Wallet.findById(transaction.walletId);
      if (wallet) {
        if (newType === 'income') {
          wallet.balance += newAmount;
        } else {
          wallet.balance -= newAmount;
        }
        await wallet.save();
      }
    }

    return NextResponse.json({
      transaction: updatedTransaction,
      message: 'Transação atualizada com sucesso',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update transaction error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar transação' },
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

    const transaction = await Transaction.findOneAndDelete({
      _id: params.id,
      userId: authResult.user.userId,
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      );
    }

    // Reverter saldo se necessário
    if (transaction.accountId) {
      const Account = (await import('@/models/Account')).default;
      const account = await Account.findById(transaction.accountId);
      if (account) {
        if (transaction.type === 'income') {
          account.balance -= transaction.amount;
        } else {
          account.balance += transaction.amount;
        }
        await account.save();
      }
    } else if (transaction.walletId) {
      const Wallet = (await import('@/models/Wallet')).default;
      const wallet = await Wallet.findById(transaction.walletId);
      if (wallet) {
        if (transaction.type === 'income') {
          wallet.balance -= transaction.amount;
        } else {
          wallet.balance += transaction.amount;
        }
        await wallet.save();
      }
    }

    return NextResponse.json({ message: 'Transação removida com sucesso' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover transação' },
      { status: 500 }
    );
  }
}





