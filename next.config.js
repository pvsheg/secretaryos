/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] }
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Tell webpack not to bundle these — they are loaded at runtime on the server
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
