/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add CORS headers to allow cross-origin font loading
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, HEAD, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
        ],
      },
    ];
  },
  webpack(config, { webpack }) {
    config.module.rules.push({
      test: /\.svg$/,
      issuer: {
        and: [/\.(js|ts)x?$/]
      },

      use: [{ loader: '@svgr/webpack' }]
    });
    // Temporary fix until the following fix is merged into our NextJS version: https://github.com/vercel/next.js/pull/65248
    // Should be included in NextJS >= 14.2.6
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NEXT_PUBLIC_URL': JSON.stringify(
          process.env.NEXT_PUBLIC_URL ?? ''
        )
      })
    );

    return config;
  }
};

export default nextConfig;
