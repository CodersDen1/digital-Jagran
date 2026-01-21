const articleRepository = require('../repositories/articleRepository');
const translationService = require('../services/translationService');

class ArticleController {
    async createArticle(req, res) {
        try {
            const articleData = req.body;
            // Create single article based on payload (Language is decided by client)
            const newArticle = await articleRepository.create(articleData);
            res.status(201).json(newArticle);
        } catch (error) {
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
                article_header: 'Translating...',
                summary: 'Translating content...',
                body: 'Please wait, content is being translated.',
                // Clear fields to avoid mixed content (very simple approach)
                article_header_en: 'Translating...',
                summary_en: undefined,
                body_en: undefined
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
                    } else {
                        console.log("English translation not fully implemented yet in this flow");
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
            const updatedArticle = await articleRepository.update(req.params.id, req.body);
            if (!updatedArticle) return res.status(404).json({ message: 'Article not found' });
            res.status(200).json(updatedArticle);
        } catch (error) {
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
