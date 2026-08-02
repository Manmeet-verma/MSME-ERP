/** @type {import('next').NextConfig} */
const API_BACKEND_URL = process.env.API_BACKEND_URL || "https://msme-erp-backend.vercel.app";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;