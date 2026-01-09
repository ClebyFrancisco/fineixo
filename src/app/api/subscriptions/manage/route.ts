import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import { authenticateRequest } from "@/middleware/auth";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const manageSchema = z.object({
  action: z.enum(["cancel", "reactivate"]),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ("error" in authResult) {
      return authResult.error;
    }

    await connectDB();

    const body = await request.json();
    const { action } = manageSchema.parse(body);

    const subscription = await Subscription.findOne({
      userId: authResult.user.userId,
      status: "active",
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Assinatura não encontrada" },
        { status: 404 }
      );
    }

    if (action === "cancel") {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      subscription.cancelAtPeriodEnd = true;
      subscription.canceledAt = new Date();
      await subscription.save();

      return NextResponse.json({
        message: "Assinatura será cancelada ao final do período",
      });
    } else if (action === "reactivate") {
      // Reactivate subscription
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      subscription.cancelAtPeriodEnd = false;
      subscription.canceledAt = undefined;
      await subscription.save();

      return NextResponse.json({
        message: "Assinatura reativada com sucesso",
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Manage subscription error:", error);
    return NextResponse.json(
      { error: "Erro ao gerenciar assinatura" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if ("error" in authResult) {
      return authResult.error;
    }

    await connectDB();

    const subscription = await Subscription.findOne({
      userId: authResult.user.userId,
      status: "active",
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Assinatura não encontrada" },
        { status: 404 }
      );
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Create portal session error:", error);
    return NextResponse.json(
      { error: "Erro ao criar sessão do portal" },
      { status: 500 }
    );
  }
}

