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

    /**
     * Fetch published articles with minimal fields for listing pages.
     * Skips heavy fields like elementContent, keywords, body, html_path.
     * ~80% smaller response vs findPublished().
     */
    async findPublishedLight() {
        return await Article.find({ is_Published: true })
            .sort({ createdAt: -1 })
            .select({
                slug: 1,
                article_header: 1,
                article_header_en: 1,
                summary: 1,
                summary_en: 1,
                tags: 1,
                tags_en: 1,
                photos: 1,
                author: 1,
                published_language: 1,
                is_Published: 1,
                views: 1,
                metaTitle: 1,
                metaDescription: 1,
                createdAt: 1,
                updatedAt: 1,
            })
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
