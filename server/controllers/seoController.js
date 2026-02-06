const path = require('path');
const fs = require('fs');
const articleRepository = require('../repositories/articleRepository');

class SeoController {
    async serveArticleSeo(req, res) {
        try {
            const { slug } = req.params;
            // Support fetching by ID or Slug, robustly
            let article = await articleRepository.findBySlug(slug);
            if (!article) {
                // Try finding by ID if it looks like an ObjectId
                if (slug.match(/^[0-9a-fA-F]{24}$/)) {
                    article = await articleRepository.findById(slug);
                }
            }

            if (!article) {
                return res.status(404).send('Article not found');
            }

            // Path to client index.html
            // In dev, this is in client/index.html
            // In prod, this might be in client/dist/index.html
            // We'll inspect both or default to dev for now since user is in dev
            let templatePath = path.join(__dirname, '../../client/index.html');
            if (!fs.existsSync(templatePath)) {
                templatePath = path.join(__dirname, '../../client/dist/index.html');
            }

            if (!fs.existsSync(templatePath)) {
                return res.status(500).send('Template not found');
            }

            let html = fs.readFileSync(templatePath, 'utf8');

            // Metadata Calculation (Robust logic similar to frontend)
            const title = article.metaTitle || article.metaTitle_en || article.article_header || 'Digital Jagran';
            const description = article.metaDescription || article.metaDescription_en || article.summary || '';

            // Keywords
            let keywords = '';
            if (article.metaKeywords && article.metaKeywords.length > 0) {
                keywords = article.metaKeywords.join(', ');
            } else if (article.keywords && article.keywords.length > 0) {
                keywords = article.keywords.join(', ');
            } else {
                keywords = (article.tags || []).join(', ');
            }

            const image = (article.photos && article.photos.length > 0) ? article.photos[0] : '';
            const url = `https://www.digitaljagran.com/article/${article.slug}`;

            // Inject Title
            html = html.replace(/<title>.*<\/title>/, `<title>${title} | Digital Jagran</title>`);

            // Inject Meta Tags (Append to head)
            const metaTags = `
    <!-- Server Injected SEO Tags -->
    <meta name="description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}" />
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${image}" />
            `;

            html = html.replace('</head>', `${metaTags}\n</head>`);

            res.send(html);

        } catch (error) {
            console.error('SEO Injection Error:', error);
            res.status(500).send('Internal Server Error');
        }
    }
}

module.exports = new SeoController();
