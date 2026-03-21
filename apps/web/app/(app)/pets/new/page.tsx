'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { appConfig } from '@pawroute/config';
import { createPet, uploadPetPhoto } from '../../../../lib/pets';
import { classifyPetSize, getPetSizeOptions } from '@pawroute/utils';

const c = appConfig.brand.colors;

export default function NewPetPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    type: 'DOG' as 'DOG' | 'CAT',
    breed: '',
    ageYears: 0,
    ageMonths: 0,
    weightKg: 0,
    gender: 'UNKNOWN' as 'MALE' | 'FEMALE' | 'UNKNOWN',
    specialNotes: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [detectedBreed, setDetectedBreed] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const sizeOptions = getPetSizeOptions();
  const currentSize = form.weightKg > 0 ? classifyPetSize(form.weightKg) : null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const pet = await createPet({
        ...form,
        weightKg: Number(form.weightKg),
        ageYears: Number(form.ageYears),
        ageMonths: Number(form.ageMonths),
        ...(form.specialNotes ? { specialNotes: form.specialNotes } : {}),
      });

      if (photo) {
        const result = await uploadPetPhoto(pet.id, photo);
        if (result.detectedBreed) setDetectedBreed(result.detectedBreed);
      }

      router.push('/pets');
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to add pet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: c.primary }}>Add a Pet</h1>

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo upload */}
        <div className="flex flex-col items-center">
          <label className="cursor-pointer">
            <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed transition"
              style={{ borderColor: c.lavenderDark, backgroundColor: c.lavender }}>
              {photoPreview
                ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                : <span className="text-4xl">{form.type === 'DOG' ? '🐶' : '🐱'}</span>
              }
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
          <p className="text-xs mt-2" style={{ color: c.textSecondary }}>
            Tap to add photo · AI detects breed
          </p>
          {detectedBreed && (
            <button type="button"
              className="text-xs mt-1 px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: c.lavender, color: c.primary }}
              onClick={() => update('breed')(detectedBreed)}>
              Use AI suggestion: {detectedBreed}
            </button>
          )}
        </div>

        {/* Pet type toggle */}
        <div className="flex gap-2">
          {(['DOG', 'CAT'] as const).map((t) => (
            <button key={t} type="button"
              onClick={() => update('type')(t)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition"
              style={{
                backgroundColor: form.type === t ? c.primary : c.lavender,
                color: form.type === t ? '#fff' : c.primary,
              }}>
              {t === 'DOG' ? '🐶 Dog' : '🐱 Cat'}
            </button>
          ))}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Pet Name *</label>
          <input type="text" value={form.name} onChange={e => update('name')(e.target.value)}
            placeholder="e.g. Buddy" className="input" required minLength={1} />
        </div>

        {/* Breed */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Breed *</label>
          <input type="text" value={form.breed} onChange={e => update('breed')(e.target.value)}
            placeholder="e.g. Golden Retriever" className="input" required />
        </div>

        {/* Age */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Age (years)</label>
            <input type="number" min={0} max={30} value={form.ageYears}
              onChange={e => update('ageYears')(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Age (months)</label>
            <input type="number" min={0} max={11} value={form.ageMonths}
              onChange={e => update('ageMonths')(e.target.value)} className="input" />
          </div>
        </div>

        {/* Weight + size indicator */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>
            Weight (kg) *
          </label>
          <input type="number" min={0.1} max={200} step={0.1} value={form.weightKg || ''}
            onChange={e => update('weightKg')(e.target.value)}
            placeholder="e.g. 8.5" className="input" required />
          {currentSize && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {sizeOptions.map((s) => (
                <span key={s.value}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: s.value === currentSize ? c.primary : c.lavender,
                    color: s.value === currentSize ? '#fff' : c.textSecondary,
                  }}>
                  {s.label} ({s.range})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>Gender</label>
          <div className="flex gap-2">
            {(['MALE', 'FEMALE', 'UNKNOWN'] as const).map((g) => (
              <button key={g} type="button"
                onClick={() => update('gender')(g)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition"
                style={{
                  backgroundColor: form.gender === g ? c.secondary : c.lavender,
                  color: form.gender === g ? '#fff' : c.primary,
                }}>
                {g === 'MALE' ? '♂ Male' : g === 'FEMALE' ? '♀ Female' : '? Unknown'}
              </button>
            ))}
          </div>
        </div>

        {/* Special notes */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: c.textPrimary }}>
            Special Notes <span style={{ color: c.textSecondary }}>(optional)</span>
          </label>
          <textarea value={form.specialNotes}
            onChange={e => update('specialNotes')(e.target.value)}
            placeholder="Allergies, behaviour notes, preferences..."
            rows={3} className="input resize-none" maxLength={500} />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl font-semibold transition disabled:opacity-60"
          style={{ backgroundColor: c.accent, color: '#1a1a2e' }}>
          {loading ? 'Saving…' : 'Add Pet'}
        </button>
      </form>
    </div>
  );
}
