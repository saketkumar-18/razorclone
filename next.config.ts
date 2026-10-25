import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DB-backed dynamic app: every page reads SQLite, so no static caching.
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
