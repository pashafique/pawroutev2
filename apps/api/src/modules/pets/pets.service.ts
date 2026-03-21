/**
 * @file pets.service.ts
 * @description Pet CRUD operations with photo upload + AI breed detection.
 */

import { prisma } from '../../lib/prisma.js';
import { uploadFile, deleteFile, extractStoragePath } from '../../lib/supabase.js';
import { processImage, buildImagePath } from '../../utils/image.js';
import { classifyPetSize } from '@pawroute/utils';
import { detectBreed, getBestBreed } from '../../lib/huggingface.js';
import { appConfig } from '@pawroute/config';

// ─── List Pets ────────────────────────────────────────────────────────────────

export async function listPets(userId: string) {
  return prisma.pet.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Get Pet ──────────────────────────────────────────────────────────────────

export async function getPet(petId: string, userId: string) {
  const pet = await prisma.pet.findFirst({
    where: { id: petId, userId, deletedAt: null },
  });
  if (!pet) throw Object.assign(new Error('Pet not found'), { statusCode: 404 });
  return pet;
}

// ─── Create Pet ───────────────────────────────────────────────────────────────

export interface CreatePetInput {
  name: string;
  type: 'DOG' | 'CAT';
  breed: string;
  ageYears: number;
  ageMonths: number;
  weightKg: number;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  specialNotes?: string;
}

export async function createPet(userId: string, input: CreatePetInput) {
  const count = await prisma.pet.count({ where: { userId, deletedAt: null } });
  if (count >= appConfig.booking.maxPetsPerUser) {
    throw Object.assign(
      new Error(`Maximum ${appConfig.booking.maxPetsPerUser} pets per account`),
      { statusCode: 400 }
    );
  }

  const sizeCategory = classifyPetSize(input.weightKg);

  return prisma.pet.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      breed: input.breed,
      ageYears: input.ageYears,
      ageMonths: input.ageMonths,
      weightKg: input.weightKg,
      gender: input.gender,
      sizeCategory,
      specialNotes: input.specialNotes ?? null,
    },
  });
}

// ─── Update Pet ───────────────────────────────────────────────────────────────

export async function updatePet(petId: string, userId: string, input: Partial<CreatePetInput>) {
  await getPet(petId, userId); // throws 404 if not found

  const updates: Record<string, unknown> = { ...input };

  if (input.weightKg != null) {
    updates.sizeCategory = classifyPetSize(input.weightKg);
  }

  return prisma.pet.update({
    where: { id: petId },
    data: updates,
  });
}

// ─── Delete Pet (soft) ───────────────────────────────────────────────────────

export async function deletePet(petId: string, userId: string) {
  await getPet(petId, userId);
  await prisma.pet.update({
    where: { id: petId },
    data: { deletedAt: new Date() },
  });
}

// ─── Upload Pet Photo ─────────────────────────────────────────────────────────

export async function uploadPetPhoto(
  petId: string,
  userId: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ photoUrl: string; thumbnailUrl: string; detectedBreed: string | null }> {
  await getPet(petId, userId); // validate ownership

  const { full, thumbnail } = await processImage(imageBuffer, mimeType);
  const { fullPath, thumbnailPath } = buildImagePath('pets', userId, petId);

  const [photoUrl, thumbnailUrl] = await Promise.all([
    uploadFile(fullPath, full, 'image/webp'),
    uploadFile(thumbnailPath, thumbnail, 'image/webp'),
  ]);

  // AI breed detection — run in parallel, non-blocking failure
  let detectedBreed: string | null = null;
  try {
    const predictions = await detectBreed(imageBuffer);
    detectedBreed = getBestBreed(predictions);
  } catch {
    // Breed detection is best-effort — never block photo upload
  }

  await prisma.pet.update({
    where: { id: petId },
    data: {
      photo: photoUrl,
      thumbnailPhoto: thumbnailUrl,
      ...(detectedBreed ? { detectedBreed } : {}),
    },
  });

  return { photoUrl, thumbnailUrl, detectedBreed };
}

// ─── Delete Pet Photo ─────────────────────────────────────────────────────────

export async function deletePetPhoto(petId: string, userId: string) {
  const pet = await getPet(petId, userId);
  if (!pet.photo) return;

  const { fullPath, thumbnailPath } = buildImagePath('pets', userId, petId);
  await Promise.allSettled([deleteFile(fullPath), deleteFile(thumbnailPath)]);

  await prisma.pet.update({
    where: { id: petId },
    data: { photo: null, thumbnailPhoto: null },
  });
}
