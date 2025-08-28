import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure for GitHub Pages static export
  output: 'export',
  
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable server-side features for static export
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // Configure for static hosting
  images: {
    unoptimized: true,
  },
  
  // Base path for GitHub Pages (will be your repo name)
  // basePath: '/quiz-application', // Uncomment and set your repo name
};

export default nextConfig;
