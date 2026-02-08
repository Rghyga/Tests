/** @type {import('next').NextConfig} */
const nextConfig = {
  // supaya api route pakai runtime nodejs (bukan edge)
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "playwright-core"]
  }
};
export default nextConfig;