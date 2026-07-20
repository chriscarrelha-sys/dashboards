import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { s3StorageProvider } from './s3';

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

/** The configured default provider name (local for dev; s3 for a free host). */
export function defaultStorageProviderName(): string {
  return process.env.STORAGE_PROVIDER || 'local';
}

/** Resolve a provider by name. 'local' = disk (dev / disk hosts); 's3' = bucket. */
export function getStorageProvider(name = 'local'): StorageProvider {
  if (name === 'local') return localStorageProvider;
  if (name === 's3') return s3StorageProvider;
  throw new Error(`Storage provider "${name}" is not connected.`);
}
