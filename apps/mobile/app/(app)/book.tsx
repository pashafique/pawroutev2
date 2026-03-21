import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, FlatList, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { api } from '../../lib/api';

const c = appConfig.brand.colors;
const CUR = appConfig.locale.currencySymbol;

// ── Types ──────────────────────────────────────────────────────────────────
interface Pet { id: string; name: string; type: string; sizeCategory: string; weightKg: number; }
interface Service { id: string; name: string; description: string; durationMin: number; pricing: { sizeLabel: string; price: number }[]; addons: { id: string; name: string; price: number }[]; }
interface Slot { id: string; date: string; startTime: string; endTime: string; available: number; }
interface CalDay { date: string; available: number; hasSlots: boolean; }

type Step = 'pet' | 'service' | 'addons' | 'slot' | 'summary' | 'confirm';

export default function BookScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();

  const [step, setStep] = useState<Step>('pet');
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [calData, setCalData] = useState<CalDay[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [pet, setPet] = useState<Pet | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [calDate, setCalDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [selectedDate, setSelectedDate] = useState('');
  const [slot, setSlot] = useState<Slot | null>(null);
  const [coupon, setCoupon] = useState('');
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount?: number; error?: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/pets'),
      api.get('/services/categories'),
    ]).then(([pRes, sRes]) => {
      setPets(pRes.data.data);
      const flat: Service[] = (sRes.data.data as any[]).flatMap((cat: any) => cat.services ?? []);
      setServices(flat);
      if (serviceId) {
        const found = flat.find((s) => s.id === serviceId);
        if (found) setService(found);
      }
    });
  }, []);

  useEffect(() => {
    if (step === 'slot') loadCal();
  }, [step, calDate]);

  useEffect(() => {
    if (selectedDate) {
      api.get(`/slots/available?date=${selectedDate}`).then((r) => setSlots(r.data.data));
    }
  }, [selectedDate]);

  const loadCal = async () => {
    try {
      const r = await api.get(`/slots/calendar?year=${calDate.year}&month=${calDate.month}`);
      setCalData(r.data.data);
    } catch {}
  };

  // Price
  const svcPrice = service?.pricing.find((p) => p.sizeLabel === pet?.sizeCategory)?.price ?? 0;
  const addonFee = (service?.addons ?? []).filter((a) => addons.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const subtotal = svcPrice + addonFee;
  const discount = couponResult?.valid ? (couponResult.discount ?? 0) : 0;
  const total = Math.max(0, subtotal - discount);

  const validateCoupon = async () => {
    if (!coupon || !service) return;
    try {
      const r = await api.post('/coupons/validate', { code: coupon, serviceId: service.id, orderAmount: subtotal });
      setCouponResult({ valid: true, discount: r.data.data.discountAmount });
    } catch (e: any) {
      setCouponResult({ valid: false, error: e.response?.data?.error ?? 'Invalid coupon' });
    }
  };

  const handleBook = async () => {
    if (!pet || !service || !slot) return;
    setLoading(true); setErr('');
    try {
      const r = await api.post('/appointments', {
        petId: pet.id, serviceId: service.id, slotId: slot.id,
        addonIds: addons,
        couponCode: coupon || undefined,
        notes: notes || undefined,
      });
      setBooking(r.data.data);
      setStep('confirm');
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'Booking failed');
    } finally { setLoading(false); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const calMap = Object.fromEntries(calData.map((d) => [d.date, d]));
  const daysInMonth = new Date(calDate.year, calDate.month, 0).getDate();
  const firstDow = new Date(calDate.year, calDate.month - 1, 1).getDay();

  // ── Step: Confirmed ──────────────────────────────────────────────────────
  if (step === 'confirm' && booking) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.center}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.h1, { textAlign: 'center' }]}>Booking Confirmed!</Text>
        <Text style={styles.subText}>Your appointment is all set.</Text>
        <View style={styles.refBox}>
          <Text style={styles.refLabel}>Booking Reference</Text>
          <Text style={styles.refCode}>{booking.bookingRef}</Text>
        </View>
        <Text style={styles.subText}>
          {booking.slot?.date} at {booking.slot?.startTime}
        </Text>
        <TouchableOpacity style={[styles.btn, { marginTop: 24 }]} onPress={() => router.push('/(tabs)/appointments')}>
          <Text style={styles.btnText}>View My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)/')}>
          <Text style={[styles.link, { marginTop: 12 }]}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Step: Select Pet ─────────────────────────────────────────────────────
  if (step === 'pet') {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Which pet?</Text>
        {pets.map((p) => (
          <TouchableOpacity key={p.id}
            style={[styles.card, pet?.id === p.id && styles.cardSelected]}
            onPress={() => { setPet(p); setStep(service ? 'addons' : 'service'); }}
            activeOpacity={0.8}>
            <Text style={styles.emoji}>{p.type === 'DOG' ? '🐶' : '🐱'}</Text>
            <Text style={[styles.cardTitle, { color: c.primary }]}>{p.name}</Text>
            <Text style={styles.cardSub}>{p.sizeCategory} · {p.weightKg}kg</Text>
          </TouchableOpacity>
        ))}
        {pets.length === 0 && (
          <Text style={styles.subText}>No pets yet. Add one first!</Text>
        )}
      </ScrollView>
    );
  }

  // ── Step: Select Service ─────────────────────────────────────────────────
  if (step === 'service') {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Choose a service</Text>
        <Text style={styles.subText}>For {pet?.name}</Text>
        {services
          .filter((s) => s.pricing.some((p) => p.sizeLabel === pet?.sizeCategory))
          .map((s) => {
            const price = s.pricing.find((p) => p.sizeLabel === pet?.sizeCategory)?.price;
            return (
              <TouchableOpacity key={s.id}
                style={[styles.card, service?.id === s.id && styles.cardSelected]}
                onPress={() => { setService(s); setAddons([]); setStep('addons'); }}
                activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.primary }]}>{s.name}</Text>
                    <Text style={styles.cardSub} numberOfLines={2}>{s.description}</Text>
                    <Text style={[styles.cardSub, { color: c.secondary }]}>⏱ {s.durationMin} min</Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: c.primary }]}>{CUR} {price}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        <TouchableOpacity onPress={() => setStep('pet')}>
          <Text style={styles.link}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Step: Add-ons ────────────────────────────────────────────────────────
  if (step === 'addons') {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Add-ons</Text>
        <Text style={styles.subText}>Optional extras for {pet?.name}</Text>
        {(service?.addons ?? []).map((a) => {
          const selected = addons.includes(a.id);
          return (
            <TouchableOpacity key={a.id}
              style={[styles.addonRow, selected && styles.addonSelected]}
              onPress={() => setAddons(selected ? addons.filter((id) => id !== a.id) : [...addons, a.id])}
              activeOpacity={0.8}>
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
              </View>
              <Text style={[styles.cardTitle, { flex: 1, fontSize: 14 }]}>{a.name}</Text>
              <Text style={{ color: c.primary, fontWeight: '600' }}>+{CUR} {a.price}</Text>
            </TouchableOpacity>
          );
        })}
        {(service?.addons.length ?? 0) === 0 && (
          <Text style={styles.subText}>No add-ons available.</Text>
        )}
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.btnOutline, { flex: 1 }]} onPress={() => setStep('service')}>
            <Text style={[styles.btnText, { color: c.primary }]}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => setStep('slot')}>
            <Text style={styles.btnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Step: Date & Time ────────────────────────────────────────────────────
  if (step === 'slot') {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Pick a date & time</Text>

        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCalDate((d) => {
            const dt = new Date(d.year, d.month - 2, 1);
            return { year: dt.getFullYear(), month: dt.getMonth() + 1 };
          })}>
            <Text style={styles.monthNavBtn}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.cardTitle, { color: c.primary }]}>
            {new Date(calDate.year, calDate.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => setCalDate((d) => {
            const dt = new Date(d.year, d.month, 1);
            return { year: dt.getFullYear(), month: dt.getMonth() + 1 };
          })}>
            <Text style={styles.monthNavBtn}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.calRow}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <Text key={d} style={styles.calHeader}>{d}</Text>
          ))}
        </View>

        {/* Calendar days */}
        <View style={styles.calGrid}>
          {Array.from({ length: firstDow }).map((_, i) => <View key={`e${i}`} style={styles.calCell} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${calDate.year}-${pad(calDate.month)}-${pad(day)}`;
            const info = calMap[dateStr];
            const isPast = dateStr < today;
            const hasSlots = (info?.available ?? 0) > 0;
            const isSel = selectedDate === dateStr;

            return (
              <TouchableOpacity key={day} style={[styles.calCell,
                isSel && styles.calCellSelected,
                !isPast && hasSlots && !isSel && styles.calCellAvail,
              ]}
                disabled={isPast || !hasSlots}
                onPress={() => setSelectedDate(dateStr)}
                activeOpacity={0.7}>
                <Text style={[styles.calDay,
                  isSel && { color: '#fff' },
                  !isPast && hasSlots && !isSel && { color: c.primary },
                  (isPast || !hasSlots) && { color: '#d1d5db' },
                ]}>{day}</Text>
                {hasSlots && !isSel && <View style={[styles.dot, { backgroundColor: c.accent }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Time slots */}
        {selectedDate && (
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.cardTitle, { color: c.primary, marginBottom: 10 }]}>
              Available times
            </Text>
            {slots.length === 0 ? (
              <Text style={styles.subText}>No slots available for this date.</Text>
            ) : (
              <View style={styles.timeGrid}>
                {slots.map((s) => (
                  <TouchableOpacity key={s.id}
                    style={[styles.timeChip, slot?.id === s.id && styles.timeChipSelected]}
                    onPress={() => { setSlot(s); setStep('summary'); }}
                    activeOpacity={0.8}>
                    <Text style={[styles.timeText, slot?.id === s.id && { color: '#fff' }]}>
                      {s.startTime}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <TouchableOpacity onPress={() => setStep('addons')}>
          <Text style={styles.link}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Step: Summary ────────────────────────────────────────────────────────
  if (step === 'summary') {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Summary</Text>

        <View style={styles.summaryBox}>
          <SummaryRow label="Pet" value={`${pet?.name} (${pet?.sizeCategory})`} />
          <SummaryRow label="Service" value={service?.name ?? ''} />
          <SummaryRow label="Date" value={slot?.date ?? ''} />
          <SummaryRow label="Time" value={`${slot?.startTime} – ${slot?.endTime}`} />
          <SummaryRow label="Duration" value={`${service?.durationMin} min`} />
          {addons.length > 0 && (
            <SummaryRow label="Add-ons" value={
              (service?.addons ?? []).filter((a) => addons.includes(a.id)).map((a) => a.name).join(', ')
            } />
          )}
          <View style={styles.divider} />
          <SummaryRow label="Service fee" value={`${CUR} ${svcPrice}`} />
          {addonFee > 0 && <SummaryRow label="Add-ons" value={`${CUR} ${addonFee}`} />}
          {discount > 0 && <SummaryRow label="Discount" value={`- ${CUR} ${discount}`} green />}
          <SummaryRow label="Total" value={`${CUR} ${total}`} bold />
        </View>

        {/* Coupon */}
        <Text style={[styles.label, { marginBottom: 6 }]}>Coupon code</Text>
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} value={coupon}
            onChangeText={(v) => { setCoupon(v); setCouponResult(null); }}
            placeholder="Enter code" placeholderTextColor={c.textSecondary + '80'}
            autoCapitalize="characters" />
          <TouchableOpacity style={styles.applyBtn} onPress={validateCoupon}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
        {couponResult && (
          <Text style={{ color: couponResult.valid ? '#16a34a' : '#dc2626', fontSize: 12, marginBottom: 8 }}>
            {couponResult.valid ? `✓ ${CUR} ${couponResult.discount} saved!` : couponResult.error}
          </Text>
        )}

        {/* Notes */}
        <Text style={[styles.label, { marginTop: 12, marginBottom: 6 }]}>Notes (optional)</Text>
        <TextInput style={[styles.input, styles.textarea]} value={notes} onChangeText={setNotes}
          multiline numberOfLines={2} placeholder="Allergies, preferences..."
          placeholderTextColor={c.textSecondary + '80'} />

        {err ? <View style={styles.errBox}><Text style={styles.errText}>{err}</Text></View> : null}

        <View style={[styles.row, { marginTop: 16 }]}>
          <TouchableOpacity style={[styles.btn, styles.btnOutline, { flex: 1 }]} onPress={() => setStep('slot')}>
            <Text style={[styles.btnText, { color: c.primary }]}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnAccent, { flex: 2 }]}
            onPress={handleBook} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={[styles.btnText, { color: '#1a1a2e' }]}>Confirm Booking</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return null;
}

function SummaryRow({ label, value, bold, green }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontSize: 13, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? '700' : '500', color: green ? '#16a34a' : '#1a1a2e' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8F7FF' },
  container: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 22, fontWeight: '700', color: appConfig.brand.colors.primary, marginBottom: 4 },
  subText: { fontSize: 13, color: appConfig.brand.colors.textSecondary, marginBottom: 16 },
  emoji: { fontSize: 36, textAlign: 'center', marginBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6,
  },
  cardSelected: { borderColor: appConfig.brand.colors.primary },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { fontSize: 12, color: appConfig.brand.colors.textSecondary, marginTop: 2 },
  addonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 8,
  },
  addonSelected: { borderColor: appConfig.brand.colors.primary, backgroundColor: '#F0EEFF' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: appConfig.brand.colors.primary, borderColor: appConfig.brand.colors.primary },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthNavBtn: { fontSize: 22, paddingHorizontal: 8, color: appConfig.brand.colors.primary },
  calRow: { flexDirection: 'row', marginBottom: 4 },
  calHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  calCellSelected: { backgroundColor: appConfig.brand.colors.primary, borderRadius: 12 },
  calCellAvail: { backgroundColor: '#F0EEFF', borderRadius: 10 },
  calDay: { fontSize: 13, fontWeight: '500', color: '#374151' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  timeChipSelected: { backgroundColor: appConfig.brand.colors.primary, borderColor: appConfig.brand.colors.primary },
  timeText: { fontSize: 13, fontWeight: '600', color: appConfig.brand.colors.primary },
  summaryBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 8 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    borderWidth: 1.5, borderColor: appConfig.brand.colors.lavenderDark, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    color: appConfig.brand.colors.textPrimary, backgroundColor: '#fff',
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '500', color: appConfig.brand.colors.textPrimary },
  applyBtn: {
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#f9fafb',
  },
  applyBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  errBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginTop: 8 },
  errText: { fontSize: 12, color: '#B91C1C' },
  btn: {
    backgroundColor: appConfig.brand.colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#d1d5db' },
  btnAccent: { backgroundColor: appConfig.brand.colors.accent },
  btnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  link: { fontSize: 13, color: appConfig.brand.colors.textSecondary, marginTop: 16 },
  refBox: { backgroundColor: '#f3f4f6', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, marginVertical: 16, alignItems: 'center' },
  refLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  refCode: { fontSize: 22, fontWeight: '700', color: appConfig.brand.colors.primary },
});
