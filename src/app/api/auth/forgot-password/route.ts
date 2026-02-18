import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendResetPasswordEmail } from '@/lib/mailer';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await User.findOne({ email });

    // Por segurança, não revelamos se o email existe ou não.
    if (!user) {
      return NextResponse.json({
        message:
          'Se este email estiver cadastrado, você receberá um link para redefinir sua senha.',
      });
    }

    // Gerar token de redefinição
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save();

    const origin =
      process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || '';
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;

    await sendResetPasswordEmail(user.email, user.name, resetUrl);

    return NextResponse.json({
      message:
        'Se este email estiver cadastrado, você receberá um link para redefinir sua senha.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar recuperação de senha' },
      { status: 500 }
    );
  }
}


