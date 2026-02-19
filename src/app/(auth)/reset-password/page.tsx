'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { Lock } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-100">Carregando...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Link de redefinição inválido ou expirado.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Link de redefinição inválido ou expirado.');
      return;
    }

    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess('Senha redefinida com sucesso! Você já pode fazer login com a nova senha.');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-md p-7 sm:p-8">
        <div className="flex flex-col gap-2 mb-6">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-fit text-xs text-slate-300 hover:text-slate-100"
          >
            &larr; Voltar para login
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Definir nova senha
          </h1>
          <p className="text-sm text-slate-300">
            Crie uma nova senha forte para proteger sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              {success}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-slate-200"
            >
              Nova senha
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="block w-full rounded-lg border border-slate-700 bg-slate-900/70 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                placeholder="Digite a nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium text-slate-200"
            >
              Confirmar nova senha
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="block w-full rounded-lg border border-slate-700 bg-slate-900/70 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Salvando nova senha...' : 'Salvar nova senha'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-300">
          Lembrou sua senha?{' '}
          <Link
            href="/login"
            className="font-medium text-emerald-300 hover:text-emerald-200"
          >
            Ir para login
          </Link>
        </p>
      </div>
    </div>
  );
}


