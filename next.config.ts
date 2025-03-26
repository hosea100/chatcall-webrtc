import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    ENV_BASEURL: process.env.NEXT_PUBLIC_ENV_BASEURL,
  },
};

export default nextConfig;
