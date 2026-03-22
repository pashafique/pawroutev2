'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { appConfig } from '@pawroute/config';
import { login } from '../../../lib/auth';

const c = appConfig.brand.colors;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/home';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      router.push(next);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: c.primary }}>Welcome back</h2>
      <p className="text-sm mb-6" style={{ color: c.textSecondary }}>Sign in to manage your bookings</p>

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>
            Email or Phone
          </label>
          <input
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="jane@email.com or +971 50..."
            className="input"
            required
            autoFocus
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-medium" style={{ color: c.textPrimary }}>Password</label>
            <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: c.secondary }}>
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            className="input"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60 mt-2"
          style={{ backgroundColor: c.primary }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {(appConfig.features.googleSso || appConfig.features.facebookSso) && (
        <div className="mt-4">
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: c.border }}></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2" style={{ color: c.textSecondary }}>or continue with</span>
            </div>
          </div>
          <div className="flex gap-3">
            {appConfig.features.googleSso && (
              <a
                href={`${appConfig.api.baseUrl}/api/${appConfig.api.version}/auth/google`}
                className="flex-1 flex items-center justify-center gap-2 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition"
                style={{ borderColor: c.border, color: c.textPrimary }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/><path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/><path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                Google
              </a>
            )}
            {appConfig.features.facebookSso && (
              <a
                href={`${appConfig.api.baseUrl}/api/${appConfig.api.version}/auth/facebook`}
                className="flex-1 flex items-center justify-center gap-2 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition"
                style={{ borderColor: c.border, color: c.textPrimary }}
              >
                <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </a>
            )}
          </div>
        </div>
      )}

      <p className="text-center text-sm mt-6" style={{ color: c.textSecondary }}>
        New to {appConfig.product.name}?{' '}
        <Link href="/register" className="font-semibold hover:underline" style={{ color: c.primary }}>
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-xl" />}>
      <LoginForm />
    </Suspense>
  );
}
