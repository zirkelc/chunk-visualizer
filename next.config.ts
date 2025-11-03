import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs', 'module', 'stream/web' module on the client to prevent this error on build
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
        'stream/web': false,
      };
    }
    return config;
  },
};

export default nextConfig;
