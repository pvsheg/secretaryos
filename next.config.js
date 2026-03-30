/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
    // Tell Next.js to include the typst binary and template files in the bundle
    outputFileTracingIncludes: {
      '/api/pdf': [
        './bin/**',
        './lib/typst/**',
      ],
    },
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'X-DNS-Prefetch-Control', value: 'on' }],
      },
    ]
  },
}
module.exports = nextConfig