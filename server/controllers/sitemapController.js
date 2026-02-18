const articleRepository = require('../repositories/articleRepository');
const cache = require('../services/cacheService');

class SitemapController {
    async generateSitemap(req, res) {
        try {
            // Use cached published articles instead of fetching all then filtering
            const publishedArticles = await cache.getCachedPublishedArticles(
                () => articleRepository.findPublished()
            );

            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

            let xml = '<?xml version="1.0" encoding="UTF-8"?>';
            xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

            // Add Home Page
            xml += `
    <url>
        <loc>${clientUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>`;

            // Add Articles
            publishedArticles.forEach(article => {
                // Use slug if available for SEO friendly URLs, otherwise fallback to ID
                const identifier = article.slug || article._id;
                const lastMod = article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString();

                xml += `
    <url>
        <loc>${clientUrl}/article/${identifier}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
            });

            xml += '</urlset>';

            res.header('Content-Type', 'application/xml');
            res.send(xml);

        } catch (error) {
            console.error('Sitemap generation error:', error);
            res.status(500).send('Error generating sitemap');
        }
    }
}

module.exports = new SitemapController();
