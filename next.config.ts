import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The staff quick-add form posts an event photo (shrunk to 2,000 px in the browser) through a server action.
  // Default limit is 1 MB; stay under Vercel's 4.5 MB request cap.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "npr.brightspotcdn.com" },
      { protocol: "https", hostname: "hyfin.org" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // Old hyfin.org post links (/2024/04/07/slug) are served by app/(frontend)/legacy, which redirects to the
  // new story page. A rewrite, not a sibling route: Next forbids [category] and [year] at the same level.
  async rewrites() {
    return [{ source: "/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug", destination: "/legacy/:year/:month/:day/:slug" }];
  },
};

export default withPayload(nextConfig);
