'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { appConfig } from '@pawroute/config';
import { register, sendOtp } from '../../../lib/auth';

const c = appConfig.brand.colors;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      // Send OTP to verify email
      if (appConfig.features.emailOtp) {
        await sendOtp(form.email, 'email', form.name);
        setStep('otp');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { verifyOtp } = await import('../../../lib/auth');
      await verifyOtp(form.email, otp, 'email');
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: c.primary }}>Verify your email</h2>
        <p className="text-sm mb-6" style={{ color: c.textSecondary }}>
          We sent a {appConfig.auth.otpExpiryMinutesEmail}-minute code to <strong>{form.email}</strong>
        </p>
        {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="000000"
              className="w-full border rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2"
              style={{ borderColor: c.lavenderDark, letterSpacing: '0.4em' }}
              autoFocus
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: c.accent, color: '#1a1a2e' }}
          >
            {loading ? 'Verifying…' : 'Verify Email'}
          </button>
        </form>
        <p className="text-center text-sm mt-4" style={{ color: c.textSecondary }}>
          Didn&apos;t get it?{' '}
          <button
            onClick={() => sendOtp(form.email, 'email', form.name).catch(() => {})}
            className="font-semibold hover:underline"
            style={{ color: c.primary }}
          >
            Resend
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: c.primary }}>Create account</h2>
      <p className="text-sm mb-6" style={{ color: c.textSecondary }}>Book grooming for your pet in minutes</p>

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Full Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Jane Smith"
            className="input"
            required
            minLength={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="jane@email.com"
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+971 50 000 0000"
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Min 8 chars, uppercase, number"
            className="input"
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60 mt-2"
          style={{ backgroundColor: c.primary }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      {appConfig.features.googleSso && (
        <div className="mt-4">
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: c.border }}></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2" style={{ color: c.textSecondary }}>or</span>
            </div>
          </div>
          <a
            href={`${appConfig.api.baseUrl}/api/${appConfig.api.version}/auth/google`}
            className="w-full flex items-center justify-center gap-3 border rounded-xl py-3 font-medium hover:bg-gray-50 transition"
            style={{ borderColor: c.border, color: c.textPrimary }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/><path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/><path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            Continue with Google
          </a>
        </div>
      )}

      <p className="text-center text-sm mt-6" style={{ color: c.textSecondary }}>
        Already have an account?{' '}
        <Link href="/login" className="font-semibold hover:underline" style={{ color: c.primary }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
