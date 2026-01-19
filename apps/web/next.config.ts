import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                crypto: false,
                os: false,
            };
        }
        return config;
    },
    // next.js 16 requires turbopack config if webpack config is present
    turbopack: {},
};

export default nextConfig;
