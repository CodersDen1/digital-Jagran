const articleRepository = require('../repositories/articleRepository');

class SitemapController {
    async generateSitemap(req, res) {
        try {
            // Fetch all published articles
            // Note: articleRepository.findAll() currently returns all. 
            // We should ideally have a method for just published ones, or filter here.
            // For efficiency, repository filtering is better, but I'll check what's available.
            // Assuming findAll returns Mongoose documents, we can filter in memory for now if the set is small,
            // or better, let's assume we can filter.

            const articles = await articleRepository.findAll();

            // Filter for published articles
            const publishedArticles = articles.filter(article => article.is_Published);

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
                // Use ID primarily as requested, fallback to slug if needed (though ID should always exist)
                const identifier = article._id;
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
