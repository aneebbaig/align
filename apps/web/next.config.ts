import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The month-by-month table is shown as Forecast (code and API keep the "planner" name).
      { source: "/planner", destination: "/forecast", permanent: true },
      // Wedding plans are listed with the other plans.
      { source: "/wedding", destination: "/plans", permanent: false },
    ];
  },
};

export default nextConfig;
