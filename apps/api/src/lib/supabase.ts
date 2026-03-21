import { createClient } from '@supabase/supabase-js';
import { appConfig } from '@pawroute/config';

// Service role client (full access — server-side only, never expose to client)
export const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

const BUCKET = process.env['SUPABASE_STORAGE_BUCKET'] ?? appConfig.uploads.storageBucketPath;

/**
 * Upload a file to Supabase Storage and return the public URL.
 */
export async function uploadFile(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, data, {
    contentType,
    upsert: true,
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

/**
 * Delete a file from Supabase Storage by its path.
 */
export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

/**
 * Extract the storage path from a public URL.
 */
export function extractStoragePath(publicUrl: string): string {
  const url = new URL(publicUrl);
  const pathParts = url.pathname.split(`/${BUCKET}/`);
  return pathParts[1] ?? '';
}
