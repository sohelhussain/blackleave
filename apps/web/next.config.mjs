/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@applyflow/types', '@applyflow/validators', '@applyflow/ui']
};

export default nextConfig;
