/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  async redirects() {
    return [
      // Legacy /org portal path (pre-rename)
      { source: '/ngo/:path*', destination: '/org/:path*', permanent: false },
      { source: '/ngo', destination: '/org', permanent: false },
      { source: '/tx/:hash', destination: '/explorer/tx/:hash', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // The report form needs geolocation; keep camera/mic closed.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
