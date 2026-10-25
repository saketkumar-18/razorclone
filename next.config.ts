import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DB-backed dynamic app: every page reads the store, so no static caching.
  // pg uses optional native deps + dynamic requires — keep it external on serverless.
  serverExternalPackages: ["pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
