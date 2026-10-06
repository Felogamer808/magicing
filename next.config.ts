import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La zapata de medianería pasó a ser la zapata aislada con el pilar
  // descentrado: el enlace viejo lleva a la página que la reemplaza.
  async redirects() {
    return [
      { source: "/verificaciones/zapata-medianeria", destination: "/verificaciones/zapata-aislada", permanent: true },
    ];
  },
};

export default nextConfig;
