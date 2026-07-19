/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploaded files live under ./storage in dev; keep them out of the build trace.
  outputFileTracingExcludes: {
    '*': ['./storage/**', './legacy-prototype/**'],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
