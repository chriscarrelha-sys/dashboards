import { describe, it, expect, afterEach } from 'vitest';
import { getStorageProvider, defaultStorageProviderName } from './local';
import { s3StorageProvider, s3Configured } from './s3';

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

describe('storage provider selection', () => {
  it('defaults to local, honors STORAGE_PROVIDER', () => {
    delete process.env.STORAGE_PROVIDER;
    expect(defaultStorageProviderName()).toBe('local');
    process.env.STORAGE_PROVIDER = 's3';
    expect(defaultStorageProviderName()).toBe('s3');
  });

  it('resolves local and s3 providers, rejects unknown', () => {
    expect(getStorageProvider('local').name).toBe('local');
    expect(getStorageProvider('s3').name).toBe('s3');
    expect(() => getStorageProvider('nope')).toThrow(/not connected/);
  });

  it('reports s3 as unconfigured when env is incomplete', () => {
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    expect(s3Configured()).toBe(false);
  });

  it('s3 put fails with a clear, actionable error when unconfigured', async () => {
    delete process.env.S3_ENDPOINT;
    await expect(s3StorageProvider.put('k', Buffer.from('x'))).rejects.toThrow(/S3_ENDPOINT is not set/);
  });

  it('local storage round-trips bytes', async () => {
    process.env.STORAGE_LOCAL_ROOT = '/tmp/psw-storage-test';
    const key = `t-${Math.random().toString(36).slice(2)}`;
    const bytes = Buffer.from('hello litigation');
    await getStorageProvider('local').put(key, bytes);
    const back = await getStorageProvider('local').get(key);
    expect(back.toString()).toBe('hello litigation');
  });
});
