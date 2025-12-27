import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/jwt';
import { JWTPayload } from '@/types';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: JWTPayload } | { error: NextResponse }> {
  const token = getTokenFromRequest(request);

  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      ),
    };
  }

  try {
    const user = verifyToken(token);
    return { user };
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      ),
    };
  }
}















