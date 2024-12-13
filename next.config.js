/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Add logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Disable some optimizations temporarily for debugging
  optimizeFonts: false,
  poweredByHeader: false,
}

module.exports = nextConfig
