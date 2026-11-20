import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O site institucional é a página estática public/site.html, servida na raiz.
  async rewrites() {
    return [{ source: "/", destination: "/site.html" }];
  },
};

export default nextConfig;
