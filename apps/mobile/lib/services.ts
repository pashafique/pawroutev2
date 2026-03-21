/**
 * @file services.ts
 * @description Service catalog API client for the mobile app.
 */

import { api } from './api';
import type { ServiceCategory, Service } from '@pawroute/types';

export async function listCategories(petType?: 'DOG' | 'CAT'): Promise<ServiceCategory[]> {
  const res = await api.get('/services/categories', { params: petType ? { petType } : {} });
  return res.data.data;
}

export async function listServices(params?: {
  categoryId?: string;
  petType?: 'DOG' | 'CAT';
  weightKg?: number;
}): Promise<(Service & { priceForSize?: number | null; sizeCategory?: string })[]> {
  const res = await api.get('/services', { params });
  return res.data.data;
}
