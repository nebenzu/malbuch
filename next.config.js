/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  // Increase function timeout for image processing
  serverRuntimeConfig: {
    maxDuration: 60,
  },
};

module.exports = nextConfig;
