import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '@/types';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  console.warn('⚠️  JWT_SECRET não está definido. Usando valor padrão (não seguro para produção)');
}

export function generateToken(payload: JWTPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as string | number,
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}



