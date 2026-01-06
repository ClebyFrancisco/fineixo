import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import SubscriptionHistory from '@/models/SubscriptionHistory';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable body parsing for webhook
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          
          await handleSubscriptionCreated(subscription, session.metadata);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  metadata: any
) {
  const userId = metadata?.userId;
  if (!userId) return;

  const user = await User.findById(userId);
  if (!user) return;

  const priceId = subscription.items.data[0].price.id;
  const plan = getPlanFromPriceId(priceId);

  await Subscription.create({
    userId: user._id,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status: subscription.status as any,
    plan,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  await SubscriptionHistory.create({
    userId: user._id,
    stripeEventId: subscription.id,
    stripeEventType: 'subscription.created',
    plan,
    status: subscription.status as any,
    amount: subscription.items.data[0].price.unit_amount || 0,
    currency: subscription.currency,
    description: `Assinatura ${plan} criada`,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existingSubscription = await Subscription.findOne({
    stripeSubscriptionId: subscription.id,
  });

  if (!existingSubscription) return;

  const priceId = subscription.items.data[0].price.id;
  const plan = getPlanFromPriceId(priceId);

  existingSubscription.status = subscription.status as any;
  existingSubscription.plan = plan;
  existingSubscription.stripePriceId = priceId;
  existingSubscription.currentPeriodStart = new Date(
    subscription.current_period_start * 1000
  );
  existingSubscription.currentPeriodEnd = new Date(
    subscription.current_period_end * 1000
  );
  existingSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
  
  if (subscription.canceled_at) {
    existingSubscription.canceledAt = new Date(subscription.canceled_at * 1000);
  }

  await existingSubscription.save();

  await SubscriptionHistory.create({
    userId: existingSubscription.userId,
    subscriptionId: existingSubscription._id,
    stripeEventId: subscription.id,
    stripeEventType: 'subscription.updated',
    plan,
    status: subscription.status as any,
    amount: subscription.items.data[0].price.unit_amount || 0,
    currency: subscription.currency,
    description: `Assinatura ${plan} atualizada`,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existingSubscription = await Subscription.findOne({
    stripeSubscriptionId: subscription.id,
  });

  if (!existingSubscription) return;

  existingSubscription.status = 'canceled';
  existingSubscription.canceledAt = new Date();
  await existingSubscription.save();

  await SubscriptionHistory.create({
    userId: existingSubscription.userId,
    subscriptionId: existingSubscription._id,
    stripeEventId: subscription.id,
    stripeEventType: 'subscription.deleted',
    plan: existingSubscription.plan,
    status: 'canceled',
    amount: 0,
    currency: 'brl',
    description: 'Assinatura cancelada',
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription as string,
  });

  if (!subscription) return;

  await SubscriptionHistory.create({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    stripeEventId: invoice.id,
    stripeEventType: 'invoice.paid',
    plan: subscription.plan,
    status: subscription.status,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    description: `Pagamento recebido - ${invoice.description || 'Fatura'}`,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription as string,
  });

  if (!subscription) return;

  subscription.status = 'past_due';
  await subscription.save();

  await SubscriptionHistory.create({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    stripeEventId: invoice.id,
    stripeEventType: 'invoice.payment_failed',
    plan: subscription.plan,
    status: 'past_due',
    amount: invoice.amount_due,
    currency: invoice.currency,
    description: `Falha no pagamento - ${invoice.description || 'Fatura'}`,
  });
}

function getPlanFromPriceId(priceId: string): 'monthly' | 'semiannual' | 'annual' {
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) {
    return 'monthly';
  } else if (priceId === process.env.STRIPE_PRICE_ID_SEMIANNUAL) {
    return 'semiannual';
  } else if (priceId === process.env.STRIPE_PRICE_ID_ANNUAL) {
    return 'annual';
  }
  return 'monthly'; // default
}

