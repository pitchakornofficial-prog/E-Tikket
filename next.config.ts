import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/tickets/download": ["./src/assets/fonts/*.ttf"],
  },
};

export default nextConfig;
