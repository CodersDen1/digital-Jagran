import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://www.digitaljagran.com'; // Hardcoded as per requirement, or could be env var

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/',
        },
        sitemap: [
            `${baseUrl}/sitemap.xml`,
            `${baseUrl}/sitemap-news.xml`,
        ],
    };
}
