const Article = require('../models/Article');

class ArticleRepository {
    async create(articleData) {
        const article = new Article(articleData);
        return await article.save();
    }

    async findAll() {
        return await Article.find().sort({ createdAt: -1 });
    }

    async findById(id) {
        return await Article.findById(id);
    }

    async update(id, updateData) {
        return await Article.findByIdAndUpdate(id, updateData, { new: true });
    }

    async delete(id) {
        return await Article.findByIdAndDelete(id);
    }

    async findPublished() {
        return await Article.find({ is_Published: true }).sort({ createdAt: -1 });
    }
}

module.exports = new ArticleRepository();
