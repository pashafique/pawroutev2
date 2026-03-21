import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { api } from '../../lib/api';

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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

interface Appointment {
  id: string;
  bookingRef: string;
  status: string;
  totalAmount: number;
  pet: { name: string; type: string };
  service: { name: string; durationMin: number };
  slot: { date: string; startTime: string; endTime: string };
  payment?: { status: string; method: string } | null;
}

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await api.get('/appointments');
      setAppointments(r.data.data.appointments ?? []);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const today = new Date().toISOString().slice(0, 10);
  const filtered = appointments.filter((a) => {
    const isPast = a.slot.date < today || ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status);
    return filter === 'past' ? isPast : !isPast;
  });

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel?', [
      { text: 'No' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          await api.post(`/appointments/${id}/cancel`, { reason: 'Cancelled by customer' });
          load(true);
        } catch (err: any) {
          Alert.alert('Error', err.response?.data?.error ?? 'Failed to cancel');
        }
      }},
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={c.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>My Bookings</Text>
            <View style={styles.filterRow}>
              {(['upcoming', 'past'] as const).map((f) => (
                <TouchableOpacity key={f}
                  style={[styles.filterBtn, filter === f && styles.filterActive]}
                  onPress={() => setFilter(f)} activeOpacity={0.8}>
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === 'upcoming' ? '📅 Upcoming' : '🕐 Past'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>No {filter} bookings</Text>
            {filter === 'upcoming' && (
              <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/(tabs)/services')}>
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ref}>{item.bookingRef}</Text>
                <Text style={styles.svcName}>{item.service.name}</Text>
                <Text style={styles.petName}>{item.pet.type === 'DOG' ? '🐶' : '🐱'} {item.pet.name}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>

            <View style={styles.slotRow}>
              <Text style={styles.slotText}>📅 {item.slot.date}</Text>
              <Text style={styles.slotText}>🕐 {item.slot.startTime} – {item.slot.endTime}</Text>
              <Text style={styles.slotText}>{CUR} {item.totalAmount}</Text>
            </View>

            {['PENDING', 'CONFIRMED'].includes(item.status) && (
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rescheduleBtn}
                  onPress={() => router.push({ pathname: '/(app)/reschedule', params: { id: item.id } })}>
                  <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: c.lavender, alignItems: 'center' },
  filterActive: { backgroundColor: c.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: c.primary },
  filterTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    marginBottom: 10, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
  },
  cardTop: { flexDirection: 'row', marginBottom: 10 },
  ref: { fontSize: 10, color: c.textSecondary, fontFamily: 'monospace', marginBottom: 2 },
  svcName: { fontSize: 15, fontWeight: '700', color: c.primary },
  petName: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  slotRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  slotText: { fontSize: 11, color: c.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  rescheduleBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 10,
    backgroundColor: c.primary, alignItems: 'center',
  },
  rescheduleBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: c.textSecondary, marginBottom: 16 },
  bookBtn: { backgroundColor: c.accent, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  bookBtnText: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
});
