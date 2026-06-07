/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // wagmi/viem ship optional peer deps (e.g. pino-pretty) that are not needed
  // in the browser bundle. Silence the resolution warnings.
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Optional RN-only dependency pulled in transitively by the MetaMask SDK
    // via wagmi's connector barrel. We use the injected() connector, so this
    // module is never reached in the browser — alias it away to silence the
    // build warning.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
