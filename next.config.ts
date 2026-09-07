import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Allow this computer's addresses without storing private network details.
const localAddresses = Object.values(networkInterfaces()).flatMap((entries) =>
  (entries ?? []).filter((entry) => entry.family === "IPv4").map((entry) => entry.address),
);
const configuredOrigins = process.env.IDEAGRID_DEV_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];
const allowedDevOrigins = [...new Set([...localAddresses, ...configuredOrigins])];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
