import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Debt from '@/models/Debt';
import Transaction from '@/models/Transaction';
import Account from '@/models/Account';
import Wallet from '@/models/Wallet';
import { authenticateRequest } from '@/middleware/auth';
import { z } from 'zod';

const paySchema = z.object({
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  accountId: z.string().optional(),
  walletId: z.string().optional(),
  date: z.string().or(z.date()).optional(),
});

export async function POST(
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
    const validatedData = paySchema.parse(body);

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

    const paymentAmount = validatedData.amount;

    // Calcular quanto já foi pago
    const existingPayments = await Transaction.find({
      debtId: debt._id,
      type: 'expense',
    });

    const totalPaid = existingPayments.reduce((sum, t) => sum + t.amount, 0);
    const newTotalPaid = totalPaid + paymentAmount;

    // Determinar qual carteira/conta usar
    let finalWalletId = validatedData.walletId;
    let finalAccountId = validatedData.accountId;

    if (validatedData.accountId) {
      // Pagar com conta
      const account = await Account.findById(validatedData.accountId);
      if (!account) {
        return NextResponse.json(
          { error: 'Conta não encontrada' },
          { status: 404 }
        );
      }
      account.balance -= paymentAmount;
      await account.save();
      finalAccountId = account._id.toString();
    } else if (validatedData.walletId) {
      // Pagar com carteira específica
      const wallet = await Wallet.findById(validatedData.walletId);
      if (!wallet) {
        return NextResponse.json(
          { error: 'Carteira não encontrada' },
          { status: 404 }
        );
      }
      wallet.balance -= paymentAmount;
      await wallet.save();
      finalWalletId = wallet._id.toString();
    } else {
      // Se não especificar, usa carteira padrão
      let wallet = await Wallet.findOne({
        userId: authResult.user.userId,
        name: 'Carteira Principal',
      });

      if (!wallet) {
        wallet = await Wallet.create({
          userId: authResult.user.userId,
          name: 'Carteira Principal',
          balance: 0,
        });
      }

      wallet.balance -= paymentAmount;
      await wallet.save();
      finalWalletId = wallet._id.toString();
    }

    // Criar transação de pagamento
    const paymentDate = validatedData.date ? new Date(validatedData.date) : new Date();
    const month = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

    const transaction = await Transaction.create({
      userId: authResult.user.userId,
      type: 'expense',
      amount: paymentAmount,
      description: `Pagamento: ${debt.description}${newTotalPaid >= debt.amount ? ' (Total)' : ` (Parcial: ${formatCurrency(paymentAmount)})`}`,
      debtId: debt._id,
      accountId: finalAccountId || undefined,
      walletId: finalWalletId || undefined,
      categoryId: debt.categoryId || undefined,
      date: paymentDate,
      month,
    });

    // Atualizar status da dívida
    const isFullyPaid = newTotalPaid >= debt.amount;
    await Debt.findByIdAndUpdate(debt._id, {
      paid: isFullyPaid,
      paidAt: isFullyPaid ? paymentDate : debt.paidAt,
    });

    return NextResponse.json({
      transaction,
      debt: await Debt.findById(debt._id),
      message: isFullyPaid ? 'Dívida paga totalmente' : 'Pagamento parcial realizado',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Pay debt error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar pagamento' },
      { status: 500 }
    );
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

