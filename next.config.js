/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    domains: ['cdn.openai.com', 'lh3.googleusercontent.com', 's.gravatar.com', 'ui-avatars.com'],
  },
};

module.exports = nextConfig;