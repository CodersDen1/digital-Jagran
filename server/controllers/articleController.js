const articleRepository = require('../repositories/articleRepository');
const translationService = require('../services/translationService');

class ArticleController {
    async createArticle(req, res) {
        try {
            let articleData = req.body;

            // Auto-translate if Hindi fields are missing
            articleData = await translationService.translateArticle(articleData);

            const newArticle = await articleRepository.create(articleData);
            res.status(201).json(newArticle);
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
