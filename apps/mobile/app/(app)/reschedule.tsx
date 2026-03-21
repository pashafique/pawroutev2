import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { api } from '../../lib/api';

const c = appConfig.brand.colors;

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
}

interface GroupedDay {
  date: string;
  slots: Slot[];
}

export default function RescheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [slots, setSlots] = useState<GroupedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const until = new Date(today.getTime() + appConfig.booking.maxAdvanceBookingDays * 86400000)
      .toISOString().slice(0, 10);

    api.get('/slots/available', { params: { startDate: from, endDate: until } })
      .then((r) => {
        const raw: Slot[] = r.data.data ?? [];
        // Group by date
        const map: Record<string, Slot[]> = {};
        for (const slot of raw) {
          if (!map[slot.date]) map[slot.date] = [];
          map[slot.date].push(slot);
        }
        const grouped = Object.entries(map)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, s]) => ({ date, slots: s }));
        setSlots(grouped);
        if (grouped.length > 0) setSelectedDate(grouped[0].date);
      })
      .catch(() => Alert.alert('Error', 'Failed to load available slots'))
      .finally(() => setLoading(false));
  }, []);

  const handleReschedule = async () => {
    if (!selectedSlot || !id) return;
    setSaving(true);
    try {
      await api.post(`/appointments/${id}/reschedule`, { newSlotId: selectedSlot.id });
      Alert.alert('Rescheduled!', `Your appointment has been moved to ${selectedSlot.date} at ${selectedSlot.startTime}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error ?? 'Reschedule failed');
    } finally {
      setSaving(false);
    }
  };

  const slotsForDate = selectedDate
    ? slots.find((g) => g.date === selectedDate)?.slots ?? []
    : [];

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reschedule</Text>
      </View>

      {/* Date picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePicker}>
        {slots.map((g) => (
          <TouchableOpacity
            key={g.date}
            style={[styles.dateChip, selectedDate === g.date && styles.dateChipActive]}
            onPress={() => { setSelectedDate(g.date); setSelectedSlot(null); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateChipText, selectedDate === g.date && styles.dateChipTextActive]}>
              {formatDate(g.date)}
            </Text>
            <Text style={[styles.dateSlotCount, selectedDate === g.date && { color: '#fff' }]}>
              {g.slots.length} slots
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Time slots */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.slotGrid}>
        {slotsForDate.length === 0 ? (
          <Text style={styles.emptyText}>No available slots for this date.</Text>
        ) : (
          slotsForDate.map((slot) => {
            const available = slot.capacity - slot.bookedCount;
            const isFull = available <= 0;
            const isSelected = selectedSlot?.id === slot.id;
            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.slotChip,
                  isFull && styles.slotFull,
                  isSelected && styles.slotSelected,
                ]}
                onPress={() => !isFull && setSelectedSlot(slot)}
                disabled={isFull}
                activeOpacity={0.7}
              >
                <Text style={[styles.slotTime, isSelected && { color: '#fff' }, isFull && { color: '#9ca3af' }]}>
                  {slot.startTime}
                </Text>
                <Text style={[styles.slotSub, isSelected && { color: 'rgba(255,255,255,0.8)' }, isFull && { color: '#d1d5db' }]}>
                  {isFull ? 'Full' : `${available} left`}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Confirm button */}
      <View style={styles.footer}>
        {selectedSlot && (
          <Text style={styles.selectedInfo}>
            Selected: {formatDate(selectedSlot.date)} at {selectedSlot.startTime}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.confirmBtn, (!selectedSlot || saving) && styles.confirmBtnDisabled]}
          onPress={handleReschedule}
          disabled={!selectedSlot || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Reschedule</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 12,
    paddingHorizontal: 20, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  backBtn: { marginRight: 12, padding: 4 },
  backText: { fontSize: 22, color: c.primary },
  title: { fontSize: 18, fontWeight: '700', color: c.primary },
  datePicker: { flexGrow: 0, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff' },
  dateChip: {
    marginRight: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
    backgroundColor: c.lavender, alignItems: 'center',
  },
  dateChipActive: { backgroundColor: c.primary },
  dateChipText: { fontSize: 12, fontWeight: '700', color: c.primary },
  dateChipTextActive: { color: '#fff' },
  dateSlotCount: { fontSize: 10, color: c.textSecondary, marginTop: 2 },
  scroll: { flex: 1 },
  slotGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10,
  },
  emptyText: { width: '100%', textAlign: 'center', paddingTop: 32, color: c.textSecondary, fontSize: 14 },
  slotChip: {
    width: '30%', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4,
    backgroundColor: '#fff', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  slotFull: { backgroundColor: '#f9fafb' },
  slotSelected: { backgroundColor: c.primary },
  slotTime: { fontSize: 13, fontWeight: '700', color: c.primary },
  slotSub: { fontSize: 10, color: c.textSecondary, marginTop: 2 },
  footer: {
    backgroundColor: '#fff', padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 4,
  },
  selectedInfo: { fontSize: 13, color: c.textSecondary, marginBottom: 10, textAlign: 'center' },
  confirmBtn: {
    backgroundColor: c.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: c.lavender },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
