import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard/contracts/new", destination: "/review", permanent: true },
      { source: "/dashboard/review", destination: "/review", permanent: true },
      { source: "/dashboard/contracts/:path*", destination: "/contract/:path*", permanent: true },
      { source: "/management/users", destination: "/admin/users", permanent: true },
      { source: "/dashboard/admin/users", destination: "/admin/users", permanent: true },
      { source: "/dashboard/admin/management", destination: "/admin/users", permanent: true },
      { source: "/dashboard/admin/userManagement", destination: "/admin/users", permanent: true },
      { source: "/dashboard/admin/:path*", destination: "/admin/:path*", permanent: true },
      { source: "/dashboard/manager/legal-sources/:path*", destination: "/management/legal-sources/:path*", permanent: true },
      { source: "/dashboard/manager/organizations", destination: "/management/organizations", permanent: true },
      { source: "/dashboard/:role(owner|staff|expert|manager|user)/contract", destination: "/contract", permanent: true },
      { source: "/dashboard/:role(owner|staff|expert|manager|user)/review", destination: "/review", permanent: true },
      { source: "/dashboard/owner/members", destination: "/dashboard/members", permanent: true },
      { source: "/dashboard/owner/administration", destination: "/dashboard/settings", permanent: true },
      { source: "/dashboard/user/subscription", destination: "/dashboard/subscription", permanent: true },
      { source: "/dashboard/manager", destination: "/management", permanent: true },
      { source: "/dashboard/:role(owner|staff|expert|user)", destination: "/dashboard", permanent: true },
      { source: "/admin/management", destination: "/admin/users", permanent: true },
      { source: "/admin/userManagement", destination: "/admin/users", permanent: true },
    ];
  },
};
export default nextConfig;
