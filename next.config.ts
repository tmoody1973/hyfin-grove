import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "npr.brightspotcdn.com" }],
  },
};

export default nextConfig;
