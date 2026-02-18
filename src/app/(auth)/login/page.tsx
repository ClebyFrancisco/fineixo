'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-10 items-center">
        {/* Coluna de destaque */}
        <div className="hidden md:flex flex-col gap-6 text-slate-100">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 w-fit backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Controle inteligente das suas finanças pessoais
          </div>

          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
              Bem-vindo ao{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                FineixoApp
              </span>
            </h1>
            <p className="mt-3 text-sm text-slate-300 max-w-md leading-relaxed">
              Centralize contas, cartões, dívidas e investimentos em um único lugar.
              Visualize tudo com clareza e tome decisões mais inteligentes sobre o seu dinheiro.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-semibold">Visão completa</p>
              <p className="mt-1 text-[11px] text-slate-300">
                Acompanhe saldos, despesas e metas em tempo real, em um dashboard intuitivo.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-semibold">Cartões e dívidas</p>
              <p className="mt-1 text-[11px] text-slate-300">
                Organize faturas, parcelas e vencimentos sem surpresas no fim do mês.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-semibold">Segurança em dia</p>
              <p className="mt-1 text-[11px] text-slate-300">
                Seus dados são protegidos com criptografia e boas práticas de segurança.
              </p>
            </div>
          </div>
        </div>

        {/* Card de login */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-md p-7 sm:p-8">
          <div className="flex flex-col gap-2 mb-6">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold">
                F
              </span>
              <span>FineixoApp</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
              Entrar na sua conta
            </h2>
            <p className="text-sm text-slate-300">
              Acesse o painel para acompanhar seus saldos, cartões e transações.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-200"
              >
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border border-slate-700 bg-slate-900/70 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-200"
                >
                  Senha
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-lg border border-slate-700 bg-slate-900/70 py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-300">
            Ainda não tem conta?{' '}
            <Link
              href="/register"
              className="font-medium text-emerald-300 hover:text-emerald-200"
            >
              Criar conta gratuita
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}



















