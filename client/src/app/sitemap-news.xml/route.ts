import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Always generate fresh, never use build-time cache

export async function GET() {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    const fetchUrl = `${apiUrl}/articles`;

    try {
        console.log(`[sitemap-news] Fetching articles from: ${fetchUrl}`);

        const response = await fetch(fetchUrl, {
            next: { revalidate: 60 }, // Revalidate every 60 seconds
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`[sitemap-news] API returned ${response.status}: ${response.statusText}`);
            return new NextResponse('Error fetching articles for sitemap', {
                status: 502,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const allArticles = await response.json();

        // Validate response is an array
        if (!Array.isArray(allArticles)) {
            console.error(`[sitemap-news] API returned non-array response:`, typeof allArticles);
            return new NextResponse('Invalid API response format', {
                status: 502,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        console.log(`[sitemap-news] Total articles fetched: ${allArticles.length}`);

        // Filter for articles published in the last 48 hours
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recentArticles = allArticles.filter((article: any) => {
            return article.is_Published && new Date(article.createdAt) >= twoDaysAgo;
        });

        console.log(`[sitemap-news] Recent published articles (last 48h): ${recentArticles.length}`);

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
            xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
      ${recentArticles.map((article: any) => {
            // Determine language: Default to 'en' if missing or explicitly 'en', otherwise 'hi'
            const lang = (article.published_language || 'en') === 'en' ? 'en' : 'hi';

            // Select strictly matching title based on language
            let rawTitle = 'Untitled';
            if (lang === 'en') {
                rawTitle = article.article_header_en || article.metaTitle || article.article_header || 'Untitled';
            } else {
                rawTitle = article.article_header || article.metaTitle || article.article_header_en || 'Untitled';
            }

            const cleanTitle = rawTitle.replace(/ \| Digital Jagran( \d{4})?/g, '');
            const date = new Date(article.createdAt).toISOString().replace(/\.\d{3}Z$/, 'Z');

            return `
      <url>
        <loc>${escapeXml(`https://www.digitaljagran.com/article/${article.slug}`)}</loc>
        <news:news>
          <news:publication>
            <news:name>Digital Jagran</news:name>
            <news:language>${lang}</news:language>
          </news:publication>
          <news:publication_date>${date}</news:publication_date>
          <news:title>${escapeXml(cleanTitle)}</news:title>
        </news:news>
      </url>
      `;
        }).join('')}
    </urlset>`;

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
            },
        });
    } catch (error) {
        console.error('[sitemap-news] Critical error generating news sitemap:', error);
        return new NextResponse('Error generating sitemap', {
            status: 500,
            headers: { 'Cache-Control': 'no-store' },
        });
    }
}
