import os from 'os';

/**
 * Dynamically gets local IPv4 addresses to allow Next.js dev server access
 * from other devices on the same local network.
 */
function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }

  return ips;
}

const localIps = getLocalIps();

// Also include specific common subnet patterns just in case the server is
// running on a host that forwards traffic or if you want to be safe.
// Next.js config needs exact matches, so we add the exact local IPs detected.
// If the user's IP is 192.168.12.164, it will be automatically added here.

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'localhost',
    ...localIps
  ],
  turbopack: {
    resolveAlias: {
      canvas: {
        browser: './src/utils/emptyBrowserModule.ts',
      },
    },
  },
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
