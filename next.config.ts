import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The icon package exports ~12k modules from one barrel. This rewrites the
    // named imports in components/ui/icons.tsx to per-icon modules so neither
    // dev nor the bundle pays for the rest of the set.
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
};

export default nextConfig;
