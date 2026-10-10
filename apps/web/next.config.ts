import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@football/shared-types'],
};

export default nextConfig;