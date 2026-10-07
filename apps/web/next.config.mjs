import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, '../../');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@applyflow/types', '@applyflow/validators', '@applyflow/ui', '@applyflow/database'],
  experimental: {
    outputFileTracingRoot: monorepoRoot,
  },
  async rewrites() {
    const rawApiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

    // 1. If an external backend URL is configured (production or custom host),
    // proxy all /api/* requests to that backend.
    if (rawApiUrl && !rawApiUrl.includes('localhost')) {
      const cleanUrl = rawApiUrl.replace(/\/$/, '');
      return {
        beforeFiles: [
          {
            source: '/api/:path*',
            destination: `${cleanUrl}/api/:path*`
          }
        ]
      };
    }

    // 2. In local development, if external API_URL is not set or set to localhost,
    // proxy to the local Express backend on port 3001.
    if (process.env.NODE_ENV === 'development') {
      const devTarget = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : 'http://localhost:3001';
      return {
        beforeFiles: [
          {
            source: '/api/:path*',
            destination: `${devTarget}/api/:path*`
          }
        ]
      };
    }

    // 3. In production on Vercel when API_URL is not provided:
    // Do NOT rewrite to localhost:3001 (which triggers DNS_HOSTNAME_RESOLVED_PRIVATE 404).
    // Instead, allow requests to be handled by the native Next.js API route handlers.
    return [];
  }
};

export default nextConfig;
