import type { NextConfig } from "next";

const FOUNDRY_BASE = "https://100000035.auth.demo-hclvoltmx.net";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: "/foundry/:path*",
        destination: `${FOUNDRY_BASE}/:path*`,
      },
    ];
  },
};

export default nextConfig;
