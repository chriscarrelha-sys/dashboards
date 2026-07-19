import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names, resolving conflicts (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Whole days from today to `d` (negative = past), date-only. */
export function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function relativeDeadline(d: Date | string | null | undefined): {
  label: string;
  tone: 'ok' | 'warn' | 'danger' | 'muted';
} {
  const n = daysUntil(d);
  if (n === null) return { label: '—', tone: 'muted' };
  if (n < 0) return { label: `${Math.abs(n)}d overdue`, tone: 'danger' };
  if (n === 0) return { label: 'Due today', tone: 'danger' };
  if (n <= 7) return { label: `in ${n}d`, tone: 'warn' };
  return { label: `in ${n}d`, tone: 'ok' };
}
