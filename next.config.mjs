/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Docker için gerekli
  reactStrictMode: true,
  swcMinify: true,
  
  // Güvenlik ve performans ayarları
  poweredByHeader: false,
  compress: true,

  // Ortam değişkenleri için ek güvenlik
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },

  // Webpack ve diğer gelişmiş konfigürasyonlar
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  }
};

export default nextConfig;
