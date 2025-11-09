import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Docker için gerekli
  reactStrictMode: true,
  swcMinify: true,
  
  // Güvenlik ve performans ayarları
  poweredByHeader: false,
  compress: true,

  // Image optimization için external domain'ler
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // NOT: Environment variables artık env objesinde expose edilmiyor
  // Güvenlik için: Server-side'da process.env ile erişilebilir
  // Client-side'da sadece NEXT_PUBLIC_ prefix'li değişkenler erişilebilir

  // Webpack ve diğer gelişmiş konfigürasyonlar
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  }
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Development'ta PWA'yı devre dışı bırak
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
