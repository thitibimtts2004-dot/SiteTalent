import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Read-only reporting dashboard. Overview-only: the retired pages send visitors
  // home (temporary redirect, so the routes can come back without stale caches).
  async redirects() {
    return ["/sites", "/trends", "/criticality", "/workers"].map((source) => ({
      source,
      destination: "/",
      permanent: false,
    }));
  },
};

export default nextConfig;
