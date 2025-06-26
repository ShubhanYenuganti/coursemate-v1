/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5173';
console.log("RUNNING ON:", backendUrl)


const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Add support for loading PDF.js worker
    config.resolve.alias.canvas = false;
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
  env: {
    BACKEND_URL: backendUrl,
  },
}

export default nextConfig