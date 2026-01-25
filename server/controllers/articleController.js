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

            // Create a skeleton for the new article
            const newArticleData = {
                ...originalArticle.toObject(),
                _id: undefined, // New ID
                createdAt: undefined,
                updatedAt: undefined,
                published_language: targetLangCode,
                isTranslating: true,
                article_header: targetLangCode === 'en' ? (originalArticle.article_header || originalArticle.article_header_en) : 'Translating...',
                summary: targetLangCode === 'en' ? (originalArticle.summary || originalArticle.summary_en) : 'Translating content...',
                body: targetLangCode === 'en' ? (originalArticle.body || originalArticle.body_en) : 'Please wait, content is being translated.',
                article_header_en: targetLangCode === 'en' ? 'Translating...' : (originalArticle.article_header_en || originalArticle.article_header),
                summary_en: targetLangCode === 'en' ? undefined : (originalArticle.summary_en || originalArticle.summary),
                body_en: targetLangCode === 'en' ? undefined : (originalArticle.body_en || originalArticle.body),

                // RESET STATS
                views: 0,

                // Clear element content to avoid showing original language text while translating
                elementContent_en: targetLangCode === 'en' ? {} : (originalArticle.elementContent_en || originalArticle.elementContent),

                // Regenerate slug for the translated article to avoid collision
                slug: (originalArticle.slug || 'article') + '-' + targetLangCode + '-' + Date.now()
            };

            const newArticle = await articleRepository.create(newArticleData);

            // Respond immediately with the new skeleton article
            res.status(201).json(newArticle);

            // Perform Async Translation
            (async () => {
                try {
                    console.log(`Starting background translation for Article ID: ${newArticle._id} to ${targetLangCode}`);

                    let translations = {};
                    if (targetLangCode === 'HN' || targetLangCode === 'hi') {
                        translations = await translationService.getHindiTranslation(originalArticle);
                    } else if (targetLangCode === 'en') {
                        translations = await translationService.getEnglishTranslation(originalArticle);
                    } else {
                        console.log("Translation not supported for language:", targetLangCode);
                    }

                    if (Object.keys(translations).length > 0) {
                        await articleRepository.update(newArticle._id, {
                            ...translations,
                            isTranslating: false
                        });
                        console.log(`Translation completed for Article ID: ${newArticle._id}`);
                    } else {
                        await articleRepository.update(newArticle._id, {
                            isTranslating: false,
                            article_header: "Translation returned empty result"
                        });
                    }

                } catch (err) {
                    console.error("Background translation failed:", err);
                    await articleRepository.update(newArticle._id, {
                        article_header: "Translation Failed",
                        isTranslating: false
                    });
                }
            })();

        } catch (error) {
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

    async bulkDeleteArticles(req, res) {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'No article IDs provided' });
            }
            await articleRepository.deleteMany(ids);
            res.status(200).json({ message: 'Articles deleted successfully' });
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
