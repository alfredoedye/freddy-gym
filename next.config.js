const { execFileSync } = require('child_process');
const pkg = require('./package.json');

// Versión de la app, generada automáticamente en cada build:
// versión de package.json + SHA corto del commit. En Vercel el SHA viene
// de VERCEL_GIT_COMMIT_SHA (el clone de build es shallow); en local sale
// de git directamente. Se expone como NEXT_PUBLIC_APP_VERSION (inlined en
// build time — no es un secreto ni varía en runtime).
function getCommitSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

const appVersion = `v${pkg.version} (${getCommitSha()})`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  // Configuración de headers para PWA
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
  // Permitir imágenes externas (ejercicios)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/hasaneyldrm/exercises-dataset/**',
      },
    ],
  },
};

module.exports = nextConfig;
