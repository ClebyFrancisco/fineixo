import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Debt from '@/models/Debt';
import CreditCard from '@/models/CreditCard';
import { authenticateRequest } from '@/middleware/auth';
import { requireSubscription } from '@/middleware/subscription';
import { z } from 'zod';

const debtSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number(), // Permite valores negativos para reajustes
  type: z.enum(['single', 'monthly', 'installment']),
  categoryId: z.string().optional(),
  creditCardId: z.string().optional(),
  accountId: z.string().optional(),
  dueDate: z.string().or(z.date()),
  purchaseDate: z.string().or(z.date()).optional(),
  paid: z.boolean().default(false),
  installments: z
    .object({
      current: z.number().min(1),
      total: z.number().min(1),
    })
    .optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  isTotalAmount: z.boolean().optional(), // Se true, o valor é o total; se false, é o valor da parcela
  installmentCount: z.number().min(1).optional(), // Quantidade de parcelas (quando isTotalAmount é true)
});

// Função auxiliar para recalcular o limite do cartão baseado no total do mês
async function recalculateCreditCardLimit(
  creditCard: any,
  month: string,
  userId: any
) {
  // Buscar todas as dívidas do mês (compras + reajustes)
  const monthDebts = await Debt.find({
    creditCardId: creditCard._id,
    userId: userId,
    month: month,
    paid: false,
  });

  // Calcular o total do mês (compras + reajustes)
  const monthTotal = monthDebts.reduce((sum, debt) => sum + debt.amount, 0);

  // Buscar todas as dívidas não pagas de outros meses
  const allUnpaidDebts = await Debt.find({
    creditCardId: creditCard._id,
    userId: userId,
    paid: false,
  });

  // Calcular o total de todas as dívidas não pagas (exceto este mês)
  const otherMonthsTotal = allUnpaidDebts
    .filter(debt => debt.month !== month)
    .reduce((sum, debt) => sum + debt.amount, 0);

  // O limite disponível deve ser: limite total - outras dívidas - total deste mês
  creditCard.availableLimit = creditCard.limit - otherMonthsTotal - monthTotal;

  // Garantir que o limite disponível não ultrapasse o limite total
  if (creditCard.availableLimit > creditCard.limit) {
    creditCard.availableLimit = creditCard.limit;
  }
  // Garantir que o limite disponível não fique negativo
  if (creditCard.availableLimit < 0) {
    creditCard.availableLimit = 0;
  }

  await creditCard.save();
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const creditCardId = searchParams.get('creditCardId');
    const month = searchParams.get('month');
    const paid = searchParams.get('paid');

    const query: any = { 
      userId: authResult.user.userId 
    };

    if (creditCardId) {
      query.creditCardId = creditCardId;
    }

    if (month) {
      query.month = month;
    }

    if (paid !== null && paid !== '') {
      query.paid = paid === 'true';
    }

    const debts = await Debt.find(query)
      .populate('categoryId', '_id name color')
      .populate('creditCardId', 'name')
      .populate('accountId', 'name')
      .sort({ dueDate: 1 });

    return NextResponse.json({ debts });
  } catch (error) {
    console.error('Get debts error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dívidas' },
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
    const validatedData = debtSchema.parse(body);

    // Se for dívida de cartão, adiciona automaticamente ao grupo "Cartão"
    // Isso será tratado no frontend ou em uma lógica adicional

    let debts = [];
    let totalAmount = validatedData.amount;
    let installmentAmount = validatedData.amount;
    let installmentCount = validatedData.installmentCount || (validatedData.installments?.total || 1);

    // Se for parcelada e o valor for total, calcular o valor de cada parcela
    if (validatedData.type === 'installment' && validatedData.isTotalAmount) {
      installmentAmount = totalAmount / installmentCount;
      // Arredondar para 2 casas decimais
      installmentAmount = Math.round(installmentAmount * 100) / 100;
    }

    // Se for parcelada, criar múltiplas dívidas
    if (validatedData.type === 'installment' && installmentCount > 1) {
      const purchaseDate = validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : new Date(validatedData.dueDate);
      
      // Buscar o cartão para obter o melhor dia e dia de vencimento
      let bestPurchaseDay = 10; // Default
      let dueDay = 10; // Default para dia de vencimento
      let startMonthOffset = 0; // Offset inicial para o mês da primeira parcela
      
      if (validatedData.creditCardId) {
        const creditCard = await CreditCard.findOne({
          _id: validatedData.creditCardId,
          userId: subscriptionResult.user.userId,
        });
        
        if (creditCard) {
          bestPurchaseDay = creditCard.bestPurchaseDay;
          dueDay = creditCard.dueDate || creditCard.bestPurchaseDay; // Usar dueDate se disponível
          // Se a compra foi feita antes do melhor dia, primeira parcela entra no mesmo mês
          // Se foi depois ou no mesmo dia, primeira parcela entra no próximo mês
          const purchaseDay = purchaseDate.getDate();
          if (purchaseDay < bestPurchaseDay) {
            startMonthOffset = 0; // Mesmo mês
          } else {
            startMonthOffset = 1; // Próximo mês
          }
        }
      } else {
        // Se não for cartão, usar a data de vencimento informada
        startMonthOffset = 0;
      }

      for (let i = 1; i <= installmentCount; i++) {
        // Calcular data de vencimento para cada parcela
        const installmentDueDate = new Date(purchaseDate);
        installmentDueDate.setMonth(installmentDueDate.getMonth() + startMonthOffset + (i - 1));
        
        // Se for cartão, usar o dia de vencimento; senão manter o dia da data de vencimento original
        if (validatedData.creditCardId) {
          installmentDueDate.setDate(dueDay);
        } else {
          // Se não for cartão, usar o dia da data de vencimento informada
          const baseDueDate = new Date(validatedData.dueDate);
          installmentDueDate.setDate(baseDueDate.getDate());
        }
        
        // Calcular o mês da parcela
        const month = `${installmentDueDate.getFullYear()}-${String(installmentDueDate.getMonth() + 1).padStart(2, '0')}`;

        const debtData: any = {
          description: `${validatedData.description} (${i}/${installmentCount})`,
          amount: installmentAmount,
          type: validatedData.type,
          userId: subscriptionResult.user.userId,
          dueDate: installmentDueDate,
          installments: {
            current: i,
            total: installmentCount,
          },
          month: month,
        };

        if (validatedData.categoryId) debtData.categoryId = validatedData.categoryId;
        if (validatedData.creditCardId) debtData.creditCardId = validatedData.creditCardId;
        if (validatedData.accountId) debtData.accountId = validatedData.accountId;
        if (purchaseDate) debtData.purchaseDate = purchaseDate;

        const debt = await Debt.create(debtData);
        debts.push(debt);

      // Se for uma compra de cartão de crédito, atualizar o limite disponível
      // Se houver reajuste no mês, não diminuir o limite (o reajuste já cobre tudo)
      if (validatedData.creditCardId && !validatedData.paid) {
        const creditCard = await CreditCard.findOne({
          _id: validatedData.creditCardId,
          userId: subscriptionResult.user.userId,
        });

        if (creditCard) {
          // Verificar se há reajuste no mês desta parcela
          const installmentMonth = `${installmentDueDate.getFullYear()}-${String(installmentDueDate.getMonth() + 1).padStart(2, '0')}`;
          const hasAdjustment = await Debt.findOne({
            creditCardId: validatedData.creditCardId,
            userId: subscriptionResult.user.userId,
            month: installmentMonth,
            description: { $regex: /Reajuste de Fatura/i },
            paid: false,
          });

          // Se não houver reajuste, diminuir o limite normalmente
          if (!hasAdjustment) {
            creditCard.availableLimit -= installmentAmount;
            // Garantir que o limite disponível não ultrapasse o limite total
            if (creditCard.availableLimit > creditCard.limit) {
              creditCard.availableLimit = creditCard.limit;
            }
            // Garantir que o limite disponível não fique negativo
            if (creditCard.availableLimit < 0) {
              creditCard.availableLimit = 0;
            }
            await creditCard.save();
          } else {
            // Se houver reajuste, recalcular o limite baseado no total do mês
            await recalculateCreditCardLimit(creditCard, installmentMonth, authResult.user.userId);
          }
        }
      }
      }
    } else {
      // Dívida única ou mensal
      const debtData: any = {
        ...validatedData,
        userId: authResult.user.userId,
        dueDate: new Date(validatedData.dueDate),
      };

      if (validatedData.purchaseDate) {
        debtData.purchaseDate = new Date(validatedData.purchaseDate);
      }

      const debt = await Debt.create(debtData);
      debts.push(debt);

      // Se for uma compra de cartão de crédito, atualizar o limite disponível
      // Se houver reajuste no mês, não diminuir o limite (o reajuste já cobre tudo)
      if (validatedData.creditCardId && !validatedData.paid) {
        const creditCard = await CreditCard.findOne({
          _id: validatedData.creditCardId,
          userId: subscriptionResult.user.userId,
        });

        if (creditCard) {
          // Verificar se há reajuste no mês
          const debtMonth = validatedData.month || `${new Date(validatedData.dueDate).getFullYear()}-${String(new Date(validatedData.dueDate).getMonth() + 1).padStart(2, '0')}`;
          const hasAdjustment = await Debt.findOne({
            creditCardId: validatedData.creditCardId,
            userId: subscriptionResult.user.userId,
            month: debtMonth,
            description: { $regex: /Reajuste de Fatura/i },
            paid: false,
          });

          // Se for um reajuste, sempre recalcular o limite
          if (validatedData.description && validatedData.description.includes('Reajuste de Fatura')) {
            await recalculateCreditCardLimit(creditCard, debtMonth, authResult.user.userId);
          } else if (!hasAdjustment) {
            // Se não houver reajuste, diminuir o limite normalmente
            creditCard.availableLimit -= validatedData.amount;
            // Garantir que o limite disponível não ultrapasse o limite total
            if (creditCard.availableLimit > creditCard.limit) {
              creditCard.availableLimit = creditCard.limit;
            }
            // Garantir que o limite disponível não fique negativo
            if (creditCard.availableLimit < 0) {
              creditCard.availableLimit = 0;
            }
            await creditCard.save();
          } else {
            // Se houver reajuste, recalcular o limite baseado no total do mês
            await recalculateCreditCardLimit(creditCard, debtMonth, authResult.user.userId);
          }
        }
      }
    }

    return NextResponse.json(
      { 
        debt: debts.length === 1 ? debts[0] : debts,
        debts: debts.length > 1 ? debts : undefined,
        message: debts.length > 1 
          ? `${debts.length} parcelas criadas com sucesso` 
          : 'Dívida criada com sucesso' 
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create debt error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar dívida' },
      { status: 500 }
    );
  }
}



