import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { authenticateRequest } from '@/middleware/auth';

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





