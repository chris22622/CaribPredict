/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Force the new service worker to take over all open tabs immediately
  // and wipe any outdated caches from the previous design. Critical when
  // shipping a UI rewrite over a PWA that users already installed.
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.pollinations.ai' },
    ],
  },
};

module.exports = withPWA(nextConfig);
