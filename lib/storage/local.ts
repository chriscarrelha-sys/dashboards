import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * StorageProvider interface + local implementation.
 *
 * v1 stores originals under STORAGE_LOCAL_ROOT (default ./storage). Later
 * providers (iCloud companion, OneDrive) implement the same interface so
 * callers never change. Files are addressed by an opaque `key`.
 */
export interface StorageProvider {
  readonly name: string;
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

const ROOT = process.env.STORAGE_LOCAL_ROOT || './storage';

export const localStorageProvider: StorageProvider = {
  name: 'local',
  async put(key, bytes) {
    await mkdir(ROOT, { recursive: true });
    await writeFile(join(ROOT, key), bytes);
  },
  async get(key) {
    return readFile(join(ROOT, key));
  },
};

/** Resolve a provider by name; only 'local' is wired in v1. */
export function getStorageProvider(name = 'local'): StorageProvider {
  if (name === 'local') return localStorageProvider;
  throw new Error(`Storage provider "${name}" is not connected yet.`);
}
