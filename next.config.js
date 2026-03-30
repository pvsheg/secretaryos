/** @type {import('next').NextConfig} */
const nextConfig = {

  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] }
  },

  // Cache static assets aggressively
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}
module.exports = nextConfig