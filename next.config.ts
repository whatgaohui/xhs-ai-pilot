import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow cross-origin requests in dev for preview panel (space-z.ai, localhost, etc.)
  // Supports wildcard patterns like *.space-z.ai for dynamic preview subdomains
  allowedDevOrigins: [
    "*.localhost",
    "localhost",
    "*.space-z.ai",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://0.0.0.0:3000",
    "http://localhost:81",
    "http://127.0.0.1:81",
    "http://0.0.0.0:81",
  ],
  // Allow all cross-origin in dev for preview iframe
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },
  // Force server restart to pick up Prisma schema changes
  serverExternalPackages: ["@prisma/client", "@prisma/engines", "sharp"],
};

export default nextConfig;
