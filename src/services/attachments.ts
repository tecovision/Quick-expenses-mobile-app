import * as FileSystem from 'expo-file-system/legacy';
import { uid } from '../utils/helpers';

const ATTACHMENTS_DIR = (FileSystem.documentDirectory ?? '') + 'attachments/';

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(ATTACHMENTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ATTACHMENTS_DIR, { intermediates: true });
  }
}

/**
 * Copy a picked image from its temporary URI into the app's persistent
 * documentDirectory/attachments/. Returns the new persistent file:// URI.
 *
 * Image-picker URIs in the cache directory can be evicted by the OS, so
 * we copy them out before storing the reference on disk.
 */
export async function persistAttachment(sourceUri: string): Promise<string> {
  await ensureDir();
  const extMatch = sourceUri.match(/\.(\w+)(?:\?.*)?$/);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const dest = `${ATTACHMENTS_DIR}${uid()}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

/** Delete an attachment file. Safe to call on a missing file. */
export async function deleteAttachment(uri?: string): Promise<void> {
  if (!uri || !uri.startsWith(ATTACHMENTS_DIR)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}

/** Wipe every attachment at once — the whole-app "erase all data" path. */
export async function deleteAllAttachments(): Promise<void> {
  try {
    await FileSystem.deleteAsync(ATTACHMENTS_DIR, { idempotent: true });
  } catch {
    /* ignore */
  }
}
