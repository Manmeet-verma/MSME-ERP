const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const API_BACKEND_URL =
  process.env.API_BACKEND_URL || "http://localhost:8080";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
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
