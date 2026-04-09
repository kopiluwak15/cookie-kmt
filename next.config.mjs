/** @type {import('next').NextConfig} */
const nextConfig = {
  // パッケージインポートの最適化（バンドルサイズ削減）
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
};

export default nextConfig;
