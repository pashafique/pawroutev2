/**
 * @file pets.ts
 * @description Pet API client for the mobile app.
 */

import { api } from './api';
import type { Pet } from '@pawroute/types';

export async function listPets(): Promise<Pet[]> {
  const res = await api.get('/pets');
  return res.data.data;
}

export async function getPet(petId: string): Promise<Pet> {
  const res = await api.get(`/pets/${petId}`);
  return res.data.data;
}

export async function createPet(data: {
  name: string;
  type: 'DOG' | 'CAT';
  breed: string;
  ageYears: number;
  ageMonths: number;
  weightKg: number;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  specialNotes?: string;
}): Promise<Pet> {
  const res = await api.post('/pets', data);
  return res.data.data;
}

export async function updatePet(petId: string, data: Partial<Parameters<typeof createPet>[0]>): Promise<Pet> {
  const res = await api.patch(`/pets/${petId}`, data);
  return res.data.data;
}

export async function deletePet(petId: string): Promise<void> {
  await api.delete(`/pets/${petId}`);
}

export async function uploadPetPhoto(
  petId: string,
  uri: string,
  mimeType: string = 'image/jpeg'
): Promise<{ photoUrl: string; thumbnailUrl: string; detectedBreed: string | null }> {
  const form = new FormData();
  form.append('file', { uri, type: mimeType, name: 'photo.jpg' } as any);
  const res = await api.post(`/pets/${petId}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
