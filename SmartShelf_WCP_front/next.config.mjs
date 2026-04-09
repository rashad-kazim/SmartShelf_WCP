import { networkInterfaces } from 'node:os';

const allowedDevOrigins = Array.from(
  new Set([
    '127.0.0.1',
    'localhost',
    ...Object.values(networkInterfaces())
      .flat()
      .filter((entry) => entry && entry.family === 'IPv4' && entry.internal === false)
      .map((entry) => entry.address),
  ]),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8080/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
