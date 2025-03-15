import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "www.venex.com.ar",
      },
      {
        hostname: "imagenes.compragamer.com",
      },
    ],
  },
};

export default nextConfig;
