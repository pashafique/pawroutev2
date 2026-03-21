'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { appConfig } from '@pawroute/config';
import { listPets, deletePet } from '../../../lib/pets';
import type { Pet } from '@pawroute/types';
import { getPetSizeOptions } from '@pawroute/utils';

const c = appConfig.brand.colors;

const SIZE_BADGE: Record<string, { bg: string; text: string }> = {
  SMALL:  { bg: c.lavender, text: c.primary },
  MEDIUM: { bg: '#E8E4F8', text: '#5C4EB0' },
  LARGE:  { bg: '#FFF0B3', text: '#7A5500' },
  XL:     { bg: '#FFE4EE', text: '#8B1A4A' },
};

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setPets(await listPets());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (petId: string, name: string) => {
    if (!confirm(`Remove ${name} from your account?`)) return;
    await deletePet(petId);
    setPets((p) => p.filter((x) => x.id !== petId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">🐾</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: c.primary }}>My Pets</h1>
          <p className="text-sm mt-0.5" style={{ color: c.textSecondary }}>
            {pets.length} / {appConfig.booking.maxPetsPerUser} pets
          </p>
        </div>
        {pets.length < appConfig.booking.maxPetsPerUser && (
          <Link
            href="/pets/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{ backgroundColor: c.accent, color: '#1a1a2e' }}
          >
            + Add Pet
          </Link>
        )}
      </div>

      {pets.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: c.lavender }}>
          <div className="text-5xl mb-3">🐾</div>
          <p className="font-semibold" style={{ color: c.primary }}>No pets yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: c.textSecondary }}>
            Add your first pet to get started
          </p>
          <Link
            href="/pets/new"
            className="px-6 py-2.5 rounded-xl font-semibold inline-block"
            style={{ backgroundColor: c.primary, color: '#fff' }}
          >
            Add Your Pet
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => {
            const sizeBadge = SIZE_BADGE[pet.sizeCategory] ?? SIZE_BADGE['MEDIUM']!;
            return (
              <div key={pet.id} className="bg-white rounded-2xl p-4 shadow-sm border flex gap-4"
                style={{ borderColor: c.lavenderDark }}>
                {/* Avatar */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: c.lavender }}>
                  {pet.photo
                    ? <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">
                        {pet.type === 'DOG' ? '🐶' : '🐱'}
                      </div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-bold text-lg leading-tight" style={{ color: c.primary }}>
                        {pet.name}
                      </h2>
                      <p className="text-sm" style={{ color: c.textSecondary }}>{pet.breed}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sizeBadge.bg, color: sizeBadge.text }}>
                      {pet.sizeCategory}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: c.textSecondary }}>
                    {pet.weightKg} kg · {pet.ageYears}y {pet.ageMonths}m · {pet.gender.toLowerCase()}
                  </p>

                  <div className="flex gap-2 mt-3">
                    <Link href={`/pets/${pet.id}`}
                      className="text-xs font-medium px-3 py-1 rounded-lg"
                      style={{ backgroundColor: c.lavender, color: c.primary }}>
                      Edit
                    </Link>
                    <Link href={`/book?petId=${pet.id}`}
                      className="text-xs font-medium px-3 py-1 rounded-lg"
                      style={{ backgroundColor: c.accent, color: '#1a1a2e' }}>
                      Book Now
                    </Link>
                    <button
                      onClick={() => handleDelete(pet.id, pet.name)}
                      className="text-xs font-medium px-3 py-1 rounded-lg ml-auto"
                      style={{ color: '#B91C1C', backgroundColor: '#FEF2F2' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
