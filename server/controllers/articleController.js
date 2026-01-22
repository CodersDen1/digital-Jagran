const articleRepository = require('../repositories/articleRepository');
const translationService = require('../services/translationService');

class ArticleController {
    async createArticle(req, res) {
        try {
            const articleData = req.body;

            // SEO: Generate Slug if not provided
            if (!articleData.slug) {
                const titleToSlug = articleData.article_header_en || articleData.article_header || 'article';
                articleData.slug = titleToSlug
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)+/g, '') + '-' + Date.now();
            }

            // SEO: Default Meta Title
            if (!articleData.metaTitle) {
                articleData.metaTitle = articleData.article_header_en || articleData.article_header;
            }

            // SEO: Default Meta Description
            if (!articleData.metaDescription) {
                const summary = articleData.summary_en || articleData.summary || '';
                articleData.metaDescription = summary.substring(0, 160);
            }

            // Create single article based on payload (Language is decided by client)
            const newArticle = await articleRepository.create(articleData);
            res.status(201).json(newArticle);
        } catch (error) {
            // Handle duplicate key error for slug
            if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
                return res.status(400).json({ error: 'Slug must be unique.' });
            }
            res.status(500).json({ error: error.message });
        }
    }

    async translateArticle(req, res) {
        try {
            const { id } = req.params;
            const { targetLanguage } = req.body; // Expect 'en' or 'HN' (or 'hi')

            const originalArticle = await articleRepository.findById(id);
            if (!originalArticle) {
                return res.status(404).json({ error: 'Article not found' });
            }

            // Determine target language code
            const targetLangCode = targetLanguage || (originalArticle.published_language === 'en' ? 'HN' : 'en');
            console.log(`Starting synchronous translation for Article ID: ${id} to ${targetLangCode}`);

            let translations = {};
            if (targetLangCode === 'HN' || targetLangCode === 'hi') {
                translations = await translationService.getHindiTranslation(originalArticle);
            } else if (targetLangCode === 'en') {
                translations = await translationService.getEnglishTranslation(originalArticle);
            } else {
                return res.status(400).json({ error: "Translation to " + targetLangCode + " not supported yet" });
            }

            if (Object.keys(translations).length === 0) {
                return res.status(500).json({ error: "Translation returned empty result." });
            }

            // Create new article data, clearing old language fields
            const newArticleData = {
                ...originalArticle.toObject(),
                _id: undefined, // New ID
                createdAt: undefined,
                updatedAt: undefined,
                published_language: targetLangCode,
                isTranslating: false,

                // Clear fields to avoid mixed content
                article_header: undefined,
                summary: undefined,
                body: undefined,
                metadata: undefined,
                keywords: [],
                tags: [],
                article_header_en: undefined,
                summary_en: undefined,
                body_en: undefined,
                metadata_en: undefined,
                keywords_en: [],
                tags_en: [],
                elementContent: {},
                elementContent_en: {},

                // Apply translations
                ...translations,

                // Regenerate slug
                slug: (originalArticle.slug || 'article') + '-' + targetLangCode + '-' + Date.now()
            };

            const newArticle = await articleRepository.create(newArticleData);
            console.log(`Translation completed and article created: ${newArticle._id}`);

            res.status(201).json(newArticle);

        } catch (error) {
            console.error("Translation failed:", error);
            res.status(500).json({ error: error.message });
        }
    }



    async getAllArticles(req, res) {
        try {
            const articles = await articleRepository.findAll();
            res.status(200).json(articles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getArticleById(req, res) {
        try {
            const article = await articleRepository.findById(req.params.id);
            if (!article) return res.status(404).json({ message: 'Article not found' });
            res.status(200).json(article);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateArticle(req, res) {
        try {
            const updates = req.body;

            // SEO: Update slug if title changes and slug is not explicitly provided (optional logic, kept simple for now)
            // For now, only auto-generate slug on creation to preserve URLs.
            // If user wants to update slug, they must send it explicitly.

            // SEO: Default Meta Title sync (optional, only if metaTitle is empty)
            if (updates.article_header_en && !updates.metaTitle) {
                updates.metaTitle = updates.article_header_en;
            }

            const updatedArticle = await articleRepository.update(req.params.id, updates);
            if (!updatedArticle) return res.status(404).json({ message: 'Article not found' });
            res.status(200).json(updatedArticle);
        } catch (error) {
            if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
                return res.status(400).json({ error: 'Slug must be unique.' });
            }
            res.status(500).json({ error: error.message });
        }
    }

    async deleteArticle(req, res) {
        try {
            const deletedArticle = await articleRepository.delete(req.params.id);
            if (!deletedArticle) return res.status(404).json({ message: 'Article not found' });
            res.status(200).json({ message: 'Article deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async incrementViews(req, res) {
        try {
            const article = await articleRepository.incrementViews(req.params.id);
            if (!article) return res.status(404).json({ message: 'Article not found' });
            res.status(200).json({ views: article.views });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTrendingArticles(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const articles = await articleRepository.findTrending(limit);
            res.status(200).json(articles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ArticleController();
