'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { appConfig } from '@pawroute/config';
import { api } from '../../lib/api';

const c = appConfig.brand.colors;
const CUR = appConfig.locale.currencySymbol;

interface Appointment {
  id: string;
  bookingRef: string;
  status: string;
  service: { name: string };
  slot: { date: string; startTime: string };
}

interface Pet { id: string; name: string; type: string; }

export default function HomePage() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/users/me').then((r) => setUser(r.data.data)).catch(() => {}),
      api.get('/appointments?status=CONFIRMED').then((r) => setUpcoming(r.data.data.appointments?.slice(0, 2) ?? [])).catch(() => {}),
      api.get('/pets').then((r) => setPets(r.data.data?.slice(0, 3) ?? [])).catch(() => {}),
    ]);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="rounded-3xl p-6 mb-6 text-white" style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})` }}>
        <p className="text-white/80 text-sm mb-1">Hello, {user?.name?.split(' ')[0] ?? 'there'} 👋</p>
        <h1 className="text-2xl font-bold mb-4">{appConfig.product.tagline}</h1>
        <Link href="/book"
          className="inline-block px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: c.accent, color: '#1a1a2e' }}>
          Book an Appointment →
        </Link>
      </div>

      {/* Upcoming appointments */}
      {upcoming.length > 0 && (
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold" style={{ color: c.primary }}>Upcoming Bookings</h2>
            <Link href="/appointments" className="text-xs" style={{ color: c.secondary }}>View all</Link>
          </div>
          <div className="space-y-3">
            {upcoming.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="text-2xl">📅</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: c.primary }}>{a.service.name}</p>
                  <p className="text-xs text-gray-500">{a.slot.date} at {a.slot.startTime}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{a.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="mb-6">
        <h2 className="font-bold mb-3" style={{ color: c.primary }}>Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/book', icon: '✂️', label: 'Book Grooming' },
            { href: '/pets', icon: '🐾', label: 'My Pets' },
            { href: '/services', icon: '📋', label: 'Services' },
            { href: '/gallery', icon: '📸', label: 'Gallery' },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
              <span className="text-2xl">{item.icon}</span>
              <span className="font-medium text-sm" style={{ color: c.primary }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* My pets */}
      {pets.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold" style={{ color: c.primary }}>My Pets</h2>
            <Link href="/pets" className="text-xs" style={{ color: c.secondary }}>Manage</Link>
          </div>
          <div className="flex gap-3">
            {pets.map((pet) => (
              <div key={pet.id} className="bg-white rounded-2xl p-3 shadow-sm text-center">
                <div className="text-2xl mb-1">{pet.type === 'DOG' ? '🐶' : '🐱'}</div>
                <p className="text-xs font-semibold" style={{ color: c.primary }}>{pet.name}</p>
              </div>
            ))}
            <Link href="/pets/new" className="bg-gray-100 rounded-2xl p-3 text-center flex items-center justify-center w-16 h-20 hover:bg-gray-200">
              <span className="text-2xl text-gray-400">+</span>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
