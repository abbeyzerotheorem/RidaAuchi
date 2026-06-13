import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR when opening the dev server via LAN IP (e.g. http://192.168.1.200:3000)
  allowedDevOrigins: ['192.168.1.200'],
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
};

export default nextConfig;
