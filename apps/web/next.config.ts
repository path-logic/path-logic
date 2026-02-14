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
    async rewrites() {
        if (process.env['NODE_ENV'] === 'development') {
            return [
                {
                    source: '/storybook',
                    destination: 'http://localhost:6006',
                },
                {
                    source: '/storybook/:path*',
                    destination: 'http://localhost:6006/:path*',
                },
                {
                    source: '/sb-common-assets/:path*',
                    destination: 'http://localhost:6006/sb-common-assets/:path*',
                },
                {
                    source: '/sb-manager/:path*',
                    destination: 'http://localhost:6006/sb-manager/:path*',
                },
                {
                    source: '/sb-preview/:path*',
                    destination: 'http://localhost:6006/sb-preview/:path*',
                },
                {
                    source: '/sb-addons/:path*',
                    destination: 'http://localhost:6006/sb-addons/:path*',
                },
                {
                    source: '/mocker-runtime-injected.js',
                    destination: 'http://localhost:6006/mocker-runtime-injected.js',
                },
                {
                    source: '/favicon.svg',
                    destination: 'http://localhost:6006/favicon.svg',
                },
                {
                    source: '/__webpack_hmr',
                    destination: 'http://localhost:6006/__webpack_hmr',
                },
                {
                    source: '/iframe.html',
                    destination: 'http://localhost:6006/iframe.html',
                },
                {
                    source: '/index.json',
                    destination: 'http://localhost:6006/index.json',
                },
            ];
        }
        return [];
    },
};

export default nextConfig;
