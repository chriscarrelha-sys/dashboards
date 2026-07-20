'use client';

import { useEffect } from 'react';

/** Registers the conservative offline-shell service worker (see public/sw.js). */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline shell is best-effort; never block the app */
      });
    }
  }, []);
  return null;
}
