import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/prayer", destination: "/prayers", permanent: true },
      { source: "/scripture", destination: "/bible", permanent: true },
      // v3.4: the Jesus Prayer counter page was retired in favor of the
      // learning lesson. Old bookmarks land on the lesson that teaches
      // the prayer itself.
      {
        source: "/prayers/jesus-prayer",
        destination: "/prayers/learning/jesus-prayer",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
