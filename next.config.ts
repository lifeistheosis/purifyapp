import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/prayer", destination: "/prayers", permanent: true },
      { source: "/scripture", destination: "/bible", permanent: true },
    ];
  },
};

export default nextConfig;
