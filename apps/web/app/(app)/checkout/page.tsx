'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { appConfig } from '@pawroute/config';
import { api } from '../../../lib/api';

const c = appConfig.brand.colors;
const CUR = appConfig.locale.currencySymbol;

interface Appointment {
  id: string;
  bookingRef: string;
  totalAmount: number;
  service: { name: string };
  pet: { name: string };
  slot: { date: string; startTime: string };
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointmentId');

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState<'card' | 'cash'>('card');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentId) return;
    api.get(`/appointments/${appointmentId}`).then((r) => {
      setAppointment(r.data.data);
    }).finally(() => setLoading(false));
  }, [appointmentId]);

  const handleCardPayment = async () => {
    if (!appointment) return;
    setProcessing(true); setError('');
    try {
      // In production, integrate Stripe.js here
      // For now, we initiate the intent and show the client_secret for Stripe Elements
      const r = await api.post('/payments/initiate', { appointmentId: appointment.id });
      // Redirect to Stripe-hosted payment or use Elements
      // For this implementation, we show a simple form placeholder
      alert(`Payment initiated. ClientSecret: ${r.data.data.clientSecret?.slice(0, 20)}...`);
      router.push('/appointments');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Payment failed');
    } finally { setProcessing(false); }
  };

  const handleCashPayment = async () => {
    if (!appointment) return;
    setProcessing(true); setError('');
    try {
      await api.post('/payments/cash', { appointmentId: appointment.id });
      router.push('/appointments');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed');
    } finally { setProcessing(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: c.primary }} /></div>;
  }

  if (!appointment) {
    return <div className="text-center py-16 text-gray-500">Appointment not found.</div>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1" style={{ color: c.primary }}>Checkout</h1>
      <p className="text-sm text-gray-500 mb-6">Complete your booking payment</p>

      {/* Booking summary */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-6">
        <p className="text-xs text-gray-400 font-mono mb-1">{appointment.bookingRef}</p>
        <p className="font-semibold" style={{ color: c.primary }}>{appointment.service.name}</p>
        <p className="text-sm text-gray-500">for {appointment.pet.name}</p>
        <p className="text-sm text-gray-500">{appointment.slot.date} at {appointment.slot.startTime}</p>
        <p className="text-xl font-bold mt-2" style={{ color: c.primary }}>{CUR} {appointment.totalAmount}</p>
      </div>

      {/* Payment method selector */}
      <p className="text-sm font-semibold mb-3" style={{ color: c.primary }}>Payment method</p>
      <div className="space-y-2 mb-6">
        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${method === 'card' ? 'border-primary bg-purple-50' : 'border-gray-200'}`}
          style={method === 'card' ? { borderColor: c.primary } : {}}>
          <input type="radio" name="method" checked={method === 'card'} onChange={() => setMethod('card')} />
          <span className="text-xl">💳</span>
          <div>
            <p className="font-medium">Credit / Debit Card</p>
            <p className="text-xs text-gray-500">Secure payment via Stripe</p>
          </div>
        </label>

        {appConfig.features.cashOnArrival && (
          <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${method === 'cash' ? 'border-primary bg-purple-50' : 'border-gray-200'}`}
            style={method === 'cash' ? { borderColor: c.primary } : {}}>
            <input type="radio" name="method" checked={method === 'cash'} onChange={() => setMethod('cash')} />
            <span className="text-xl">💵</span>
            <div>
              <p className="font-medium">Cash on Arrival</p>
              <p className="text-xs text-gray-500">Pay at the salon</p>
            </div>
          </label>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>}

      <button
        onClick={method === 'card' ? handleCardPayment : handleCashPayment}
        disabled={processing}
        className="w-full py-4 rounded-xl font-semibold text-sm disabled:opacity-60 transition-opacity"
        style={{ backgroundColor: method === 'card' ? c.primary : c.accent, color: method === 'card' ? '#fff' : '#1a1a2e' }}>
        {processing ? 'Processing…' : method === 'card' ? `Pay ${CUR} ${appointment.totalAmount}` : 'Confirm Cash on Arrival'}
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
