/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Docker için gerekli
  reactStrictMode: true,
  swcMinify: true,
  
  // Güvenlik ve performans ayarları
  poweredByHeader: false,
  compress: true,

  // NOT: Environment variables artık env objesinde expose edilmiyor
  // Güvenlik için: Server-side'da process.env ile erişilebilir
  // Client-side'da sadece NEXT_PUBLIC_ prefix'li değişkenler erişilebilir

  // Webpack ve diğer gelişmiş konfigürasyonlar
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  }
};

export default nextConfig;
