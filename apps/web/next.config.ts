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
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                pathname: '/**',
            },
        ],
    },
    turbopack: {},
};

export default nextConfig;
