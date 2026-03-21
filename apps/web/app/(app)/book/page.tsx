'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { appConfig } from '@pawroute/config';
import { api } from '../../../lib/api';

const c = appConfig.brand.colors;
const CUR = appConfig.locale.currencySymbol;

// ── Types ──────────────────────────────────────────────────────────────────
interface Pet { id: string; name: string; type: string; sizeCategory: string; weightKg: number; thumbnailPhoto?: string; }
interface Service { id: string; name: string; description: string; durationMin: number; pricing: { sizeLabel: string; price: number }[]; addons: { id: string; name: string; price: number }[]; }
interface TimeSlot { id: string; date: string; startTime: string; endTime: string; available: number; }
interface CalendarDay { date: string; available: number; hasSlots: boolean; }

// ── Steps ──────────────────────────────────────────────────────────────────
type Step = 'pet' | 'service' | 'addons' | 'slot' | 'summary' | 'confirm';

const STEPS: { key: Step; label: string }[] = [
  { key: 'pet', label: 'Select Pet' },
  { key: 'service', label: 'Service' },
  { key: 'addons', label: 'Add-ons' },
  { key: 'slot', label: 'Date & Time' },
  { key: 'summary', label: 'Summary' },
  { key: 'confirm', label: 'Confirm' },
];

function BookingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<Step>('pet');
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountAmount?: number; error?: string } | null>(null);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<any>(null);

  const [calMonth, setCalMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  useEffect(() => {
    api.get('/pets').then((r) => setPets(r.data.data));
    api.get('/services/categories').then((r) => {
      const allServices: Service[] = (r.data.data as any[]).flatMap((cat: any) => cat.services ?? []);
      setServices(allServices);
    });
    const svcId = searchParams.get('serviceId');
    if (svcId) {
      // Pre-select service and jump to service step
    }
  }, []);

  useEffect(() => {
    if (step === 'slot') {
      loadCalendar(calMonth.year, calMonth.month);
    }
  }, [step, calMonth]);

  useEffect(() => {
    if (selectedDate) {
      api.get(`/slots/available?date=${selectedDate}`).then((r) => setSlots(r.data.data));
    }
  }, [selectedDate]);

  const loadCalendar = async (year: number, month: number) => {
    const r = await api.get(`/slots/calendar?year=${year}&month=${month}`);
    setCalendar(r.data.data);
  };

  // ── Price calculation ────────────────────────────────────────────────────
  const getServicePrice = () => {
    if (!selectedService || !selectedPet) return 0;
    const p = selectedService.pricing.find((pr) => pr.sizeLabel === selectedPet.sizeCategory);
    return p?.price ?? 0;
  };

  const getAddonFee = () => {
    if (!selectedService) return 0;
    return selectedService.addons
      .filter((a) => selectedAddons.includes(a.id))
      .reduce((s, a) => s + a.price, 0);
  };

  const subtotal = getServicePrice() + getAddonFee();
  const discount = couponResult?.valid ? (couponResult.discountAmount ?? 0) : 0;
  const total = Math.max(0, subtotal - discount);

  // ── Coupon validation ────────────────────────────────────────────────────
  const validateCoupon = async () => {
    if (!couponCode || !selectedService) return;
    try {
      const r = await api.post('/coupons/validate', {
        code: couponCode,
        serviceId: selectedService.id,
        orderAmount: subtotal,
      });
      setCouponResult({ valid: true, discountAmount: r.data.data.discountAmount });
    } catch (err: any) {
      setCouponResult({ valid: false, error: err.response?.data?.error ?? 'Invalid coupon' });
    }
  };

  // ── Submit booking ───────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!selectedPet || !selectedService || !selectedSlot) return;
    setLoading(true);
    setError('');
    try {
      const r = await api.post('/appointments', {
        petId: selectedPet.id,
        serviceId: selectedService.id,
        slotId: selectedSlot.id,
        addonIds: selectedAddons,
        couponCode: couponCode || undefined,
        notes: notes || undefined,
      });
      setBooking(r.data.data);
      setStep('confirm');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step navigator ───────────────────────────────────────────────────────
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const canGoBack = stepIndex > 0 && step !== 'confirm';

  // ── Calendar helpers ─────────────────────────────────────────────────────
  const daysInMonth = new Date(calMonth.year, calMonth.month, 0).getDate();
  const firstDow = new Date(calMonth.year, calMonth.month - 1, 1).getDay();
  const today = new Date().toISOString().slice(0, 10);
  const calMap = Object.fromEntries(calendar.map((d) => [d.date, d]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Step indicator */}
      {step !== 'confirm' && (
        <div className="flex items-center justify-between mb-8">
          {STEPS.filter((s) => s.key !== 'confirm').map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < stepIndex ? 'bg-green-500 text-white' :
                i === stepIndex ? 'text-white' : 'bg-gray-200 text-gray-500'
              }`}
                style={i === stepIndex ? { backgroundColor: c.primary } : {}}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={`ml-1.5 text-xs hidden sm:inline ${i === stepIndex ? 'font-semibold' : 'text-gray-400'}`}
                style={i === stepIndex ? { color: c.primary } : {}}>
                {s.label}
              </span>
              {i < STEPS.length - 2 && <div className="w-4 h-px bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
      )}

      {/* ── Step: Select Pet ──────────────────────────────────────────────── */}
      {step === 'pet' && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: c.primary }}>Which pet are we booking for?</h2>
          <p className="text-sm text-gray-500 mb-6">Select or add a pet</p>
          {pets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You don't have any pets yet.</p>
              <a href="/pets/new" className="btn-primary px-6 py-2 rounded-xl font-semibold inline-block"
                style={{ backgroundColor: c.primary, color: '#fff' }}>Add a Pet</a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {pets.map((pet) => (
                <button key={pet.id}
                  onClick={() => { setSelectedPet(pet); setStep('service'); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                    selectedPet?.id === pet.id ? 'border-primary shadow-md' : 'border-gray-200'
                  }`}
                  style={selectedPet?.id === pet.id ? { borderColor: c.primary } : {}}>
                  <div className="text-2xl mb-1">{pet.type === 'DOG' ? '🐶' : '🐱'}</div>
                  <div className="font-semibold" style={{ color: c.primary }}>{pet.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{pet.sizeCategory} · {pet.weightKg}kg</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step: Select Service ──────────────────────────────────────────── */}
      {step === 'service' && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: c.primary }}>Choose a service</h2>
          <p className="text-sm text-gray-500 mb-6">For {selectedPet?.name}</p>
          <div className="space-y-3">
            {services
              .filter((s) => s.pricing.some((p) => p.sizeLabel === selectedPet?.sizeCategory))
              .map((svc) => {
                const price = svc.pricing.find((p) => p.sizeLabel === selectedPet?.sizeCategory)?.price;
                return (
                  <button key={svc.id}
                    onClick={() => { setSelectedService(svc); setSelectedAddons([]); setStep('addons'); }}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                      selectedService?.id === svc.id ? 'border-primary' : 'border-gray-200'
                    }`}
                    style={selectedService?.id === svc.id ? { borderColor: c.primary } : {}}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold" style={{ color: c.primary }}>{svc.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{svc.description}</div>
                        <div className="text-xs mt-1" style={{ color: c.secondary }}>⏱ {svc.durationMin} min</div>
                      </div>
                      <div className="font-bold text-sm ml-3 shrink-0" style={{ color: c.primary }}>
                        {CUR} {price}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
          <button onClick={() => setStep('pet')} className="mt-4 text-sm text-gray-500 hover:underline">← Back</button>
        </div>
      )}

      {/* ── Step: Add-ons ─────────────────────────────────────────────────── */}
      {step === 'addons' && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: c.primary }}>Add-ons (optional)</h2>
          <p className="text-sm text-gray-500 mb-6">Enhance {selectedPet?.name}'s experience</p>
          {selectedService?.addons.length === 0 ? (
            <p className="text-gray-400 text-sm mb-6">No add-ons available for this service.</p>
          ) : (
            <div className="space-y-2 mb-6">
              {selectedService?.addons.map((a) => (
                <label key={a.id}
                  className="flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 rounded"
                      checked={selectedAddons.includes(a.id)}
                      onChange={(e) => {
                        setSelectedAddons(e.target.checked
                          ? [...selectedAddons, a.id]
                          : selectedAddons.filter((id) => id !== a.id));
                      }} />
                    <span className="font-medium text-sm">{a.name}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: c.primary }}>+{CUR} {a.price}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep('service')} className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold">← Back</button>
            <button onClick={() => setStep('slot')}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: c.primary }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Date & Time ─────────────────────────────────────────────── */}
      {step === 'slot' && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: c.primary }}>Pick a date & time</h2>
          <p className="text-sm text-gray-500 mb-4">Choose an available appointment slot</p>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCalMonth((m) => {
              const d = new Date(m.year, m.month - 2, 1);
              return { year: d.getFullYear(), month: d.getMonth() + 1 };
            })} className="p-2 rounded-lg hover:bg-gray-100">‹</button>
            <span className="font-semibold" style={{ color: c.primary }}>
              {new Date(calMonth.year, calMonth.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCalMonth((m) => {
              const d = new Date(m.year, m.month, 1);
              return { year: d.getFullYear(), month: d.getMonth() + 1 };
            })} className="p-2 rounded-lg hover:bg-gray-100">›</button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-6">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calMonth.year}-${String(calMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const info = calMap[dateStr];
              const isPast = dateStr < today;
              const isSelected = selectedDate === dateStr;
              const hasSlots = (info?.available ?? 0) > 0;

              return (
                <button key={day}
                  disabled={isPast || !hasSlots}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                    isSelected ? 'text-white shadow-md' :
                    hasSlots ? 'hover:bg-purple-50' :
                    isPast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                  }`}
                  style={isSelected ? { backgroundColor: c.primary } : hasSlots ? { color: c.primary } : {}}>
                  {day}
                  {hasSlots && !isSelected && (
                    <div className="w-1 h-1 rounded-full mx-auto mt-0.5" style={{ backgroundColor: c.accent }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: c.primary }}>
                Available times for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {slots.length === 0 ? (
                <p className="text-sm text-gray-400">No slots available for this date.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => (
                    <button key={slot.id}
                      onClick={() => { setSelectedSlot(slot); setStep('summary'); }}
                      className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                        selectedSlot?.id === slot.id ? 'text-white' : 'hover:border-primary'
                      }`}
                      style={selectedSlot?.id === slot.id ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: '#e5e7eb' }}>
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => setStep('addons')} className="mt-4 text-sm text-gray-500 hover:underline">← Back</button>
        </div>
      )}

      {/* ── Step: Summary ─────────────────────────────────────────────────── */}
      {step === 'summary' && selectedPet && selectedService && selectedSlot && (
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: c.primary }}>Booking Summary</h2>
          <p className="text-sm text-gray-500 mb-6">Review your booking before confirming</p>

          <div className="rounded-2xl border border-gray-200 overflow-hidden mb-6">
            <div className="p-4 space-y-3">
              <Row label="Pet" value={`${selectedPet.name} (${selectedPet.sizeCategory})`} />
              <Row label="Service" value={selectedService.name} />
              <Row label="Date" value={new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <Row label="Time" value={`${selectedSlot.startTime} – ${selectedSlot.endTime}`} />
              <Row label="Duration" value={`${selectedService.durationMin} min`} />
              {selectedAddons.length > 0 && (
                <Row label="Add-ons" value={
                  selectedService.addons.filter((a) => selectedAddons.includes(a.id)).map((a) => a.name).join(', ')
                } />
              )}
            </div>
            <div className="border-t border-gray-100 p-4 space-y-2 bg-gray-50">
              <Row label="Service fee" value={`${CUR} ${getServicePrice()}`} />
              {getAddonFee() > 0 && <Row label="Add-ons" value={`${CUR} ${getAddonFee()}`} />}
              {discount > 0 && <Row label="Discount" value={`- ${CUR} ${discount}`} className="text-green-600" />}
              <Row label="Total" value={`${CUR} ${total}`} bold />
            </div>
          </div>

          {/* Coupon */}
          <div className="mb-4">
            <p className="text-sm font-semibold mb-2" style={{ color: c.primary }}>Coupon code</p>
            <div className="flex gap-2">
              <input value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setCouponResult(null); }}
                className="input flex-1" placeholder="Enter coupon code" />
              <button onClick={validateCoupon}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 hover:bg-gray-50">
                Apply
              </button>
            </div>
            {couponResult && (
              <p className={`text-xs mt-1 ${couponResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                {couponResult.valid ? `✓ ${CUR} ${couponResult.discountAmount} saved!` : couponResult.error}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <p className="text-sm font-semibold mb-2" style={{ color: c.primary }}>Notes (optional)</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              className="input w-full" rows={2} placeholder="Any special instructions..." />
          </div>

          {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>}

          <div className="flex gap-3">
            <button onClick={() => setStep('slot')} className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold">← Back</button>
            <button onClick={handleBook} disabled={loading}
              className="flex-2 py-3 px-8 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
              style={{ backgroundColor: c.accent, color: '#1a1a2e' }}>
              {loading ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Confirmed ───────────────────────────────────────────────── */}
      {step === 'confirm' && booking && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: c.primary }}>Booking Confirmed!</h2>
          <p className="text-gray-500 mb-1">Your appointment is all set.</p>
          <div className="inline-block bg-gray-100 rounded-xl px-6 py-3 my-4">
            <p className="text-xs text-gray-500">Booking Reference</p>
            <p className="text-xl font-bold" style={{ color: c.primary }}>{booking.bookingRef}</p>
          </div>
          <p className="text-sm text-gray-500 mb-8">
            {new Date(booking.slot?.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
            at {booking.slot?.startTime}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => router.push('/appointments')}
              className="px-6 py-3 rounded-xl text-white font-semibold" style={{ backgroundColor: c.primary }}>
              View My Bookings
            </button>
            <button onClick={() => router.push('/')}
              className="px-6 py-3 rounded-xl border border-gray-300 font-semibold text-sm">
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? 'font-bold text-base' : 'font-medium'} ${className ?? ''}`}>{value}</span>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>}>
      <BookingFlow />
    </Suspense>
  );
}
