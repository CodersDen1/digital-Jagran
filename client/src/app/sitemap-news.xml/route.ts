import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${apiUrl}/articles`, { next: { revalidate: 600 } });

        if (!response.ok) {
            throw new Error('Failed to fetch articles');
        }

        const allArticles = await response.json();

        // Filter for articles published in the last 48 hours
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recentArticles = allArticles.filter((article: any) => {
            return article.is_Published && new Date(article.createdAt) >= twoDaysAgo;
        });

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

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
            xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
      ${recentArticles.map((article: any) => {
            // Determine language: Default to 'en' if missing or explicitly 'en', otherwise 'hi'
            const lang = (article.published_language || 'en') === 'en' ? 'en' : 'hi';

            // Select strictly matching title based on language
            // If English: Try English Header -> Meta Title -> Hindi Header (fallback)
            // If Hindi: Try Hindi Header -> Meta Title -> English Header (fallback)
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
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('Error generating news sitemap:', error);
        return new NextResponse('Error generating sitemap', { status: 500 });
    }
}
