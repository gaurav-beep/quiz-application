import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure for GitHub Pages static export
  output: 'export',
  
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Set base path for GitHub Pages
  basePath: '/quiz-application',
  
  // Disable server-side features for static export
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // Configure for static hosting
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
