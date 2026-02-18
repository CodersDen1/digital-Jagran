const Article = require('../models/Article');
const mongoose = require('mongoose');

class ArticleRepository {
    async create(articleData) {
        const article = new Article(articleData);
        return await article.save();
    }

    async findAll() {
        return await Article.find().sort({ createdAt: -1 }).lean();
    }

    async findById(id) {
        return await Article.findById(id);
    }

    /**
     * Safe update using $set - prevents data loss from findOneAndReplace
     */
    async update(id, updateData) {
        return await Article.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
    }

    async delete(id) {
        return await Article.findByIdAndDelete(id);
    }

    async deleteMany(ids) {
        return await Article.deleteMany({ _id: { $in: ids } });
    }

    async findPublished() {
        return await Article.find({ is_Published: true })
            .sort({ createdAt: -1 })
            .lean();
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
            .limit(limit)
            .lean();
    }

    async findBySlug(slug) {
        return await Article.findOne({ slug });
    }
}

module.exports = new ArticleRepository();
