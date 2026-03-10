import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const fetchUrl = `${apiUrl}/articles`;
    const clientUrl = 'https://www.digitaljagran.com';

    try {
        console.log(`[sitemap] Fetching articles from: ${fetchUrl}`);

        const response = await fetch(fetchUrl, {
            next: { revalidate: 300 }, // Revalidate every 5 minutes
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`[sitemap] API returned ${response.status}: ${response.statusText}`);
            return new NextResponse('Error fetching articles for sitemap', {
                status: 502,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const allArticles = await response.json();

        if (!Array.isArray(allArticles)) {
            console.error(`[sitemap] API returned non-array response:`, typeof allArticles);
            return new NextResponse('Invalid API response format', {
                status: 502,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const publishedArticles = allArticles.filter((article: any) => article.is_Published);

        console.log(`[sitemap] Published articles: ${publishedArticles.length}`);

        // Helper to escape XML special characters
        const escapeXml = (unsafe: string) => {
            return unsafe.replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                    default: return c;
                }
            });
        };

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        // Home page
        xml += `
    <url>
        <loc>${clientUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>`;

        // Static pages
        const staticPages = [
            { path: '/about', priority: '0.7', changefreq: 'monthly' },
            { path: '/contact', priority: '0.7', changefreq: 'monthly' },
            { path: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
            { path: '/terms', priority: '0.5', changefreq: 'yearly' },
            { path: '/disclaimer', priority: '0.5', changefreq: 'yearly' },
        ];

        staticPages.forEach(({ path, priority, changefreq }) => {
            xml += `
    <url>
        <loc>${clientUrl}${path}</loc>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;
        });

        // All published articles
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        publishedArticles.forEach((article: any) => {
            const identifier = article.slug || article._id;
            const lastMod = article.updatedAt
                ? new Date(article.updatedAt).toISOString()
                : new Date().toISOString();

            xml += `
    <url>
        <loc>${escapeXml(`${clientUrl}/article/${identifier}`)}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        xml += '</urlset>';

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
            },
        });
    } catch (error) {
        console.error('[sitemap] Critical error generating sitemap:', error);
        return new NextResponse('Error generating sitemap', {
            status: 500,
            headers: { 'Cache-Control': 'no-store' },
        });
    }
}
