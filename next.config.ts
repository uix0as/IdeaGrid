import type { NextConfig } from "next";

const allowedDevOrigins = process.env.IDEAGRID_DEV_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
