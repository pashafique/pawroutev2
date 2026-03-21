'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appConfig } from '@pawroute/config';
import { api } from '../../../lib/api';

const c = appConfig.brand.colors;

interface User {
  id: string; name: string; email: string; phone: string;
  profilePhoto?: string; otpVerified: boolean; createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/me').then((r) => {
      setUser(r.data.data);
      setForm({ name: r.data.data.name, phone: r.data.data.phone });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.patch('/users/me', form);
      setUser((u) => u ? { ...u, ...form } : u);
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: c.primary }} /></div>;
  }

  if (!user) return <div className="text-center py-16 text-gray-500">Not logged in.</div>;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: c.primary }}>Profile</h1>

      <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ backgroundColor: c.lavender }}>
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : '🐾'}
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: c.primary }}>{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            {user.otpVerified && (
              <span className="text-xs text-green-600 font-semibold">✓ Verified</span>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <label className="text-sm font-medium" style={{ color: c.primary }}>Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input w-full mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: c.primary }}>Phone</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="input w-full mt-1" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-xl border border-gray-300 text-sm font-semibold">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: c.primary }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span>{user.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member since</span>
                <span>{new Date(user.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <button onClick={() => setEditing(true)}
              className="w-full py-2 rounded-xl border text-sm font-semibold" style={{ borderColor: c.primary, color: c.primary }}>
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {[
          { label: 'My Appointments', href: '/appointments', icon: '📅' },
          { label: 'My Pets', href: '/pets', icon: '🐾' },
          { label: 'Gallery', href: '/gallery', icon: '📸' },
        ].map((item) => (
          <a key={item.href} href={item.href}
            className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            <span className="text-gray-400">›</span>
          </a>
        ))}
      </div>

      <button onClick={handleLogout}
        className="w-full mt-6 py-3 rounded-2xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50">
        Sign Out
      </button>
    </div>
  );
}
