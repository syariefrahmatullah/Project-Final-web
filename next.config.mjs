/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg", "bcryptjs"],
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
