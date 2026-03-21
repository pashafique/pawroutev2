'use client';

import { useEffect, useState } from 'react';
import { appConfig } from '@pawroute/config';
import { listCategories } from '../../../lib/services';
import type { ServiceCategory } from '@pawroute/types';

const c = appConfig.brand.colors;

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function ServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [activeType, setActiveType] = useState<'ALL' | 'DOG' | 'CAT'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeType === 'ALL'
    ? categories
    : categories.filter((c) => c.petType === activeType);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-bounce">✂️</div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: c.primary }}>Services</h1>
      <p className="text-sm mb-5" style={{ color: c.textSecondary }}>
        Professional grooming for dogs and cats
      </p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['ALL', 'DOG', 'CAT'] as const).map((t) => (
          <button key={t}
            onClick={() => setActiveType(t)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              backgroundColor: activeType === t ? c.primary : c.lavender,
              color: activeType === t ? '#fff' : c.primary,
            }}>
            {t === 'ALL' ? '🐾 All' : t === 'DOG' ? '🐶 Dogs' : '🐱 Cats'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: c.textSecondary }}>No services available.</p>
      ) : (
        <div className="space-y-6">
          {filtered.map((cat) => (
            <div key={cat.id}>
              <h2 className="text-lg font-bold mb-3" style={{ color: c.primary }}>{cat.name}</h2>
              <div className="grid gap-3">
                {(cat as any).services?.map((svc: any) => (
                  <div key={svc.id} className="bg-white rounded-2xl p-4 border shadow-sm"
                    style={{ borderColor: c.lavenderDark }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: c.primary }}>{svc.name}</h3>
                        <p className="text-sm mt-0.5 leading-relaxed" style={{ color: c.textSecondary }}>
                          {svc.description}
                        </p>
                        <p className="text-xs mt-1.5" style={{ color: c.secondary }}>
                          ⏱ {formatDuration(svc.durationMin)}
                        </p>
                      </div>
                      {/* Price grid */}
                      {svc.pricing?.length > 0 && (
                        <div className="flex-shrink-0 text-right">
                          {svc.pricing.map((p: any) => (
                            <div key={p.sizeLabel} className="text-xs flex items-center gap-1 justify-end">
                              <span style={{ color: c.textSecondary }}>{p.sizeLabel}</span>
                              <span className="font-semibold" style={{ color: c.primary }}>
                                {appConfig.locale.currencySymbol} {p.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add-ons */}
                    {svc.addons?.length > 0 && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: c.lavender }}>
                        <p className="text-xs font-medium mb-1.5" style={{ color: c.textSecondary }}>
                          Available add-ons:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {svc.addons.map((a: any) => (
                            <span key={a.id} className="text-xs px-2.5 py-0.5 rounded-full"
                              style={{ backgroundColor: c.lavender, color: c.primary }}>
                              {a.name} +{appConfig.locale.currencySymbol}{a.price}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3">
                      <a href={`/book?serviceId=${svc.id}`}
                        className="inline-block text-sm font-semibold px-4 py-2 rounded-xl"
                        style={{ backgroundColor: c.accent, color: '#1a1a2e' }}>
                        Book Now
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
