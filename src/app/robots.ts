import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://micaguard.eu";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/onboarding", "/reset-password", "/auth", "/api"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
