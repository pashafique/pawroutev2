'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { appConfig } from '@pawroute/config';
import { api } from '../../../lib/api';

const c = appConfig.brand.colors;
const CUR = appConfig.locale.currencySymbol;

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  IN_PROGRESS: '#8B5CF6',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
  NO_SHOW: '#6B7280',
};

interface Appointment {
  id: string;
  bookingRef: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  pet: { name: string; type: string };
  service: { name: string; durationMin: number };
  slot: { date: string; startTime: string; endTime: string };
  payment?: { status: string; method: string } | null;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/appointments');
      setAppointments(r.data.data.appointments ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = appointments.filter((a) => {
    const isPast = a.slot.date < today || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status);
    return filter === 'past' ? isPast : !isPast;
  });

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api.post(`/appointments/${id}/cancel`, { reason: 'Cancelled by customer' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Failed to cancel');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: c.primary }} /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1" style={{ color: c.primary }}>My Bookings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your grooming appointments</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['upcoming', 'past'] as const).map((f) => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filter === f ? 'text-white' : ''
            }`}
            style={filter === f ? { backgroundColor: c.primary } : { backgroundColor: '#EDE9FF', color: c.primary }}>
            {f === 'upcoming' ? '📅 Upcoming' : '🕐 Past'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-gray-500 mb-4">No {filter} bookings</p>
          {filter === 'upcoming' && (
            <Link href="/book" className="inline-block px-6 py-3 rounded-xl text-white font-semibold"
              style={{ backgroundColor: c.primary }}>
              Book Now
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((appt) => (
            <div key={appt.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-0.5">{appt.bookingRef}</p>
                  <h3 className="font-bold" style={{ color: c.primary }}>{appt.service.name}</h3>
                  <p className="text-sm text-gray-500">
                    {appt.pet.type === 'DOG' ? '🐶' : '🐱'} {appt.pet.name}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[appt.status] + '20', color: STATUS_COLORS[appt.status] }}>
                  {appt.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                <span>📅 {appt.slot.date}</span>
                <span>🕐 {appt.slot.startTime} – {appt.slot.endTime}</span>
                <span>⏱ {appt.service.durationMin} min</span>
                <span className="font-semibold" style={{ color: c.primary }}>{CUR} {appt.totalAmount}</span>
              </div>

              {['PENDING', 'CONFIRMED'].includes(appt.status) && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => handleCancel(appt.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50">
                    Cancel
                  </button>
                  <Link href={`/book?reschedule=${appt.id}`}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-white"
                    style={{ backgroundColor: c.primary }}>
                    Reschedule
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
