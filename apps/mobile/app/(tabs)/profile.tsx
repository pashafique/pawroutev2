import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { appConfig } from '@pawroute/config';
import { api } from '../../lib/api';

const c = appConfig.brand.colors;

interface User { id: string; name: string; email: string; phone: string; profilePhoto?: string; otpVerified: boolean; }

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const upd = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

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
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        router.replace('/(auth)/login');
      }},
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>;
  }

  if (!user) {
    return <View style={styles.center}><Text>Not logged in</Text></View>;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {user.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={{ fontSize: 40 }}>🐾</Text>
          </View>
        )}
      </View>

      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.email}>{user.email}</Text>
      {user.otpVerified && <Text style={styles.verified}>✓ Verified</Text>}

      {/* Edit form */}
      {editing ? (
        <View style={styles.card}>
          {error ? <Text style={styles.errText}>{error}</Text> : null}
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={upd('name')}
            placeholderTextColor={c.textSecondary + '80'} />
          <Text style={[styles.label, { marginTop: 10 }]}>Phone</Text>
          <TextInput style={styles.input} value={form.phone} onChangeText={upd('phone')}
            keyboardType="phone-pad" placeholderTextColor={c.textSecondary + '80'} />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline, { flex: 1 }]} onPress={() => setEditing(false)}>
              <Text style={[styles.btnText, { color: c.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <ProfileRow label="Phone" value={user.phone || '—'} />
          <TouchableOpacity style={[styles.btn, styles.btnOutline, { marginTop: 12 }]} onPress={() => setEditing(true)}>
            <Text style={[styles.btnText, { color: c.primary }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menu */}
      <View style={styles.menu}>
        {[
          { label: 'My Bookings', icon: '📅', onPress: () => router.push('/(tabs)/appointments') },
          { label: 'My Pets', icon: '🐾', onPress: () => router.push('/(tabs)/pets') },
          { label: 'Services', icon: '✂️', onPress: () => router.push('/(tabs)/services') },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.8}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: '#6b7280', fontSize: 13 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8F7FF' },
  container: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { backgroundColor: appConfig.brand.colors.lavender, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '700', color: appConfig.brand.colors.primary, marginBottom: 2 },
  email: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  verified: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginBottom: 16 },
  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 20,
    padding: 16, marginBottom: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  label: { fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: appConfig.brand.colors.lavenderDark, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: appConfig.brand.colors.textPrimary,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { backgroundColor: appConfig.brand.colors.primary, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: appConfig.brand.colors.lavenderDark },
  btnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  errText: { color: '#dc2626', fontSize: 12, marginBottom: 8 },
  menu: { width: '100%', marginBottom: 16 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 8, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: appConfig.brand.colors.primary },
  menuArrow: { fontSize: 18, color: '#9ca3af' },
  logoutBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#FCA5A5', alignItems: 'center',
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});
