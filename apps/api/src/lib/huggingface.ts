/**
 * @file huggingface.ts
 * @description Hugging Face Inference API — AI breed detection from pet photos.
 * Model: google/vit-base-patch16-224 (image classification, free tier).
 * Feature-flagged via appConfig.features.aiBreedDetection.
 */

import { appConfig } from '@pawroute/config';

const HF_API_URL = `https://api-inference.huggingface.co/models/${appConfig.ai.breedDetection.model}`;
const HF_API_KEY = process.env['HUGGINGFACE_API_KEY'];

export interface BreedPrediction {
  label: string;
  score: number;
}

/**
 * Detect probable breed from a pet photo buffer.
 * Returns top 3 predictions sorted by confidence.
 */
export async function detectBreed(imageBuffer: Buffer): Promise<BreedPrediction[]> {
  if (!appConfig.features.aiBreedDetection) {
    return [];
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
  };
  if (HF_API_KEY) {
    headers['Authorization'] = `Bearer ${HF_API_KEY}`;
  }

  const res = await fetch(HF_API_URL, {
    method: 'POST',
    headers,
    body: imageBuffer,
  });

  if (!res.ok) {
    // Model may be loading — return empty instead of throwing
    console.warn(`Hugging Face API returned ${res.status} — breed detection skipped`);
    return [];
  }

  const data = (await res.json()) as Array<{ label: string; score: number }>;
  // Normalize label: "Labrador retriever" → "Labrador Retriever"
  return data
    .slice(0, 3)
    .map((d) => ({
      label: d.label
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      score: d.score,
    }));
}

/**
 * Get the top breed label, or null if confidence is too low.
 */
export function getBestBreed(predictions: BreedPrediction[], minScore = 0.3): string | null {
  const top = predictions[0];
  if (!top || top.score < minScore) return null;
  return top.label;
}
