'use client';

import { useState } from 'react';
import Link from 'next/link';
import { appConfig } from '@pawroute/config';
import { forgotPassword } from '../../../lib/auth';

const c = appConfig.brand.colors;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: c.primary }}>Check your inbox</h2>
        <p className="text-sm mb-6" style={{ color: c.textSecondary }}>
          If <strong>{email}</strong> is registered, we&apos;ve sent a reset link.
          It expires in {appConfig.auth.passwordResetExpiryMinutes} minutes.
        </p>
        <Link href="/login" className="font-semibold hover:underline" style={{ color: c.primary }}>
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: c.primary }}>Forgot password?</h2>
      <p className="text-sm mb-6" style={{ color: c.textSecondary }}>
        Enter your email and we&apos;ll send a reset link.
      </p>

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@email.com"
            className="input"
            required
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: c.primary }}
        >
          {loading ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: c.textSecondary }}>
        Remembered it?{' '}
        <Link href="/login" className="font-semibold hover:underline" style={{ color: c.primary }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
