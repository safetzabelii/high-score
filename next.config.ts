import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.igdb.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
    // Serve optimized images — WebP/AVIF, responsive sizes
    formats: ["image/avif", "image/webp"],
    // Sensible quality default (lower = faster, smaller)
    qualities: [75],
    minimumCacheTTL: 3600, // Cache optimized images for 1 hour
  },
};

export default nextConfig;
