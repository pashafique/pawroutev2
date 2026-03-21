/**
 * @file image.ts
 * @description Image processing utilities using Sharp.
 * Validates MIME type, converts to WebP, generates thumbnails.
 * All limits from appConfig.uploads.
 */

import sharp from 'sharp';
import { appConfig } from '@pawroute/config';

const { uploads } = appConfig;

/**
 * Process an uploaded image: validate → convert to WebP → resize.
 * Returns { full: Buffer, thumbnail: Buffer } both in WebP format.
 */
export async function processImage(
  inputBuffer: Buffer,
  mimeType: string
): Promise<{ full: Buffer; thumbnail: Buffer }> {
  // Validate MIME type
  if (!uploads.allowedImageTypes.includes(mimeType)) {
    throw new Error(
      `Unsupported image type: ${mimeType}. Allowed: ${uploads.allowedImageTypes.join(', ')}`
    );
  }

  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  // Full size (max width, WebP)
  const fullBuffer = await image
    .clone()
    .resize({ width: uploads.fullWidth, withoutEnlargement: true })
    .webp({ quality: uploads.outputQuality })
    .toBuffer();

  // Thumbnail (fixed width, WebP, cropped to square for avatars)
  const thumbBuffer = await sharp(inputBuffer)
    .resize(uploads.thumbnailWidth, uploads.thumbnailWidth, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: uploads.outputQuality })
    .toBuffer();

  return { full: fullBuffer, thumbnail: thumbBuffer };
}

/**
 * Generate a storage path for an uploaded image.
 * e.g. 'pets/{userId}/{petId}/photo.webp'
 */
export function buildImagePath(
  folder: 'pets' | 'profiles' | 'gallery',
  ...segments: string[]
): { fullPath: string; thumbnailPath: string } {
  const base = [folder, ...segments].join('/');
  return {
    fullPath: `${base}/photo.webp`,
    thumbnailPath: `${base}/thumbnail.webp`,
  };
}
