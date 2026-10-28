import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Required for Prisma on Vercel serverless
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
