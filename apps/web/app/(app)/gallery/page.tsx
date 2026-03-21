'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { appConfig } from '@pawroute/config';
import { api } from '../../../lib/api';

const c = appConfig.brand.colors;

interface GalleryImage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  petType?: string;
  beforeAfterType: string;
  caption?: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'DOG' | 'CAT'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BEFORE' | 'AFTER' | 'GENERAL'>('ALL');
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  useEffect(() => {
    api.get('/gallery').then((r) => setImages(r.data.data)).finally(() => setLoading(false));
  }, []);

  const filtered = images.filter((img) => {
    if (filter !== 'ALL' && img.petType !== filter) return false;
    if (typeFilter !== 'ALL' && img.beforeAfterType !== typeFilter) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1" style={{ color: c.primary }}>Gallery</h1>
      <p className="text-sm text-gray-500 mb-6">See our happy groomed pets!</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['ALL', 'DOG', 'CAT'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
            style={filter === f ? { backgroundColor: c.primary, color: '#fff' } : { backgroundColor: '#EDE9FF', color: c.primary }}>
            {f === 'ALL' ? '🐾 All' : f === 'DOG' ? '🐶 Dogs' : '🐱 Cats'}
          </button>
        ))}
        <div className="h-6 w-px bg-gray-200 self-center mx-1" />
        {(['ALL', 'BEFORE', 'AFTER', 'GENERAL'] as const).map((f) => (
          <button key={f} onClick={() => setTypeFilter(f)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
            style={typeFilter === f ? { backgroundColor: c.secondary, color: '#fff' } : { backgroundColor: '#f3f4f6', color: '#374151' }}>
            {f === 'ALL' ? 'All types' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No images yet</div>
      ) : (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
          {filtered.map((img) => (
            <div key={img.id} className="break-inside-avoid rounded-2xl overflow-hidden cursor-pointer group relative"
              onClick={() => setLightbox(img)}>
              <img src={img.thumbnailUrl} alt={img.caption ?? 'Gallery'} className="w-full object-cover transition-transform group-hover:scale-105" />
              {img.beforeAfterType !== 'GENERAL' && (
                <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: img.beforeAfterType === 'BEFORE' ? '#F59E0B' : '#10B981', color: '#fff' }}>
                  {img.beforeAfterType}
                </span>
              )}
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs">{img.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.imageUrl} alt={lightbox.caption ?? 'Gallery'} className="w-full rounded-2xl" />
            {lightbox.caption && (
              <p className="text-white text-center mt-3 text-sm">{lightbox.caption}</p>
            )}
            <button onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full text-white flex items-center justify-center hover:bg-black/80">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
