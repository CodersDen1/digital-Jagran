const Article = require('../models/Article');
const mongoose = require('mongoose');

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

    async deleteMany(ids) {
        return await Article.deleteMany({ _id: { $in: ids } });
    }

    async findPublished() {
        return await Article.find({ is_Published: true }).sort({ createdAt: -1 });
    }

    async incrementViews(idOrSlug) {
        const query = mongoose.Types.ObjectId.isValid(idOrSlug)
            ? { _id: idOrSlug }
            : { slug: idOrSlug };

        return await Article.findOneAndUpdate(
            query,
            { $inc: { views: 1 } },
            { new: true }
        );
    }

    async findTrending(limit = 10) {
        return await Article.find({ is_Published: true })
            .sort({ views: -1, createdAt: -1 })
            .limit(limit);
    }

    async findBySlug(slug) {
        return await Article.findOne({ slug });
    }

    async replace(id, data) {
        return await Article.findOneAndReplace({ _id: id }, data, { new: true });
    }
}

module.exports = new ArticleRepository();
