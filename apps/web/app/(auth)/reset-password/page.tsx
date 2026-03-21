'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { appConfig } from '@pawroute/config';
import { resetPassword } from '../../../lib/auth';

const c = appConfig.brand.colors;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p style={{ color: c.textSecondary }}>Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="mt-4 block font-semibold" style={{ color: c.primary }}>
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: c.primary }}>Password updated</h2>
        <p className="text-sm mb-6" style={{ color: c.textSecondary }}>Your password has been reset successfully.</p>
        <button
          onClick={() => router.push('/login')}
          className="w-full py-3 rounded-xl font-semibold text-white"
          style={{ backgroundColor: c.primary }}
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: c.primary }}>Set new password</h2>
      <p className="text-sm mb-6" style={{ color: c.textSecondary }}>
        Choose a strong password for your account.
      </p>

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>New Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min 8 chars, uppercase, number"
            className="input"
            required
            minLength={8}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat password"
            className="input"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: c.primary }}
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-8" style={{ color: appConfig.brand.colors.textSecondary }}>Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
