import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://micaguard.eu";

// Само публичните страници. Без lastModified: с Cache Components датата при build не е нужна.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1, alternates: { languages: { en: `${siteUrl}/en` } } },
    { url: `${siteUrl}/en`, changeFrequency: "weekly", priority: 0.9, alternates: { languages: { bg: `${siteUrl}/` } } },
    {
      url: `${siteUrl}/stablecoins`,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: { languages: { en: `${siteUrl}/en/stablecoins` } },
    },
    {
      url: `${siteUrl}/en/stablecoins`,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: { languages: { bg: `${siteUrl}/stablecoins` } },
    },
    { url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
