import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/api/app-thumbnail/**"
      }
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

export default nextConfig;
