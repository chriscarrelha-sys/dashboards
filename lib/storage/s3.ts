/**
 * S3-compatible object storage (Cloudflare R2, Backblaze B2, Supabase Storage,
 * AWS S3, MinIO). This is how a FREE serverless host (e.g. Vercel) persists your
 * uploaded documents — the filesystem there is ephemeral, so files live in a
 * bucket instead. Selected via STORAGE_PROVIDER=s3.
 *
 * The AWS SDK is imported lazily (dynamic import, memoized) so the local/dev path
 * never loads it. Originals remain write-once; we never mutate a stored object.
 *
 * Env:
 *   S3_ENDPOINT           e.g. https://<accountid>.r2.cloudflarestorage.com
 *   S3_REGION             default "auto" (R2); "us-east-1" etc. for others
 *   S3_BUCKET
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_FORCE_PATH_STYLE   default "true" (R2/Supabase/MinIO)
 */
import type { StorageProvider } from './local';

type S3Ctx = { client: any; bucket: string; PutObjectCommand: any; GetObjectCommand: any };
let cached: S3Ctx | null = null;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`S3 storage is selected but ${name} is not set. See docs/HOSTING.md.`);
  return v;
}

async function ctx(): Promise<S3Ctx> {
  if (cached) return cached;
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    endpoint: required('S3_ENDPOINT'),
    region: process.env.S3_REGION || 'auto',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    credentials: {
      accessKeyId: required('S3_ACCESS_KEY_ID'),
      secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
    },
  });
  cached = { client, bucket: required('S3_BUCKET'), PutObjectCommand, GetObjectCommand };
  return cached;
}

export const s3StorageProvider: StorageProvider = {
  name: 's3',
  async put(key, bytes) {
    const { client, bucket, PutObjectCommand } = await ctx();
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes }));
  },
  async get(key) {
    const { client, bucket, GetObjectCommand } = await ctx();
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    // AWS SDK v3 (Node): Body is a stream with transformToByteArray().
    const arr = await res.Body.transformToByteArray();
    return Buffer.from(arr);
  },
};

/** True when all required S3 env vars are present (for the launch-readiness gate). */
export function s3Configured(): boolean {
  return !!(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}
