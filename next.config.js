/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  env: {
    TYPST_BINARY_PATH: path.join(process.cwd(), 'bin', 'typst'),
  },
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

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        '@sparticuz/chromium',
        'puppeteer-core',
        'puppeteer',
      ]
    }
    return config
  },
}
module.exports = nextConfig
