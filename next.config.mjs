/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

/**
 * Security headers (Phase 6 §8). The CSP allows Next's inline runtime and the
 * document viewers the app needs (blob:/data: for uploaded-file previews) while
 * forbidding third-party script/frame sources. In development we relax
 * script-src (Next dev needs eval) but keep the rest strict; we never broadly
 * weaken the policy to fix a narrow issue.
 *
 * A private, single-user litigation tool must not be indexed — X-Robots-Tag
 * plus public/robots.txt keep it out of search engines.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Uploaded documents are previewed from blob:/data: URLs created in-app.
  "img-src 'self' blob: data:",
  "media-src 'self' blob: data:",
  "frame-src 'self' blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Server actions + the health endpoint are same-origin; no external calls from the browser.
  "connect-src 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  // HSTS only in production (never send it from a plain-HTTP dev server).
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Uploaded files live under ./storage in dev; keep them out of the build trace.
  outputFileTracingExcludes: {
    '*': ['./storage/**', './legacy-prototype/**'],
  },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
