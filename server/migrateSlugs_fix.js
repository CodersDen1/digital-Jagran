const mongoose = require('mongoose');
const Article = require('./models/Article');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const updateSlugs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_jagaran');
        console.log('MongoDB Connected');

        const articles = await Article.find({});
        console.log(`Found ${articles.length} articles to check.`);

        for (const article of articles) {
            // Check if slug is missing or "bad" (e.g. just a timestamp, or we just want to force update all)
            // But be careful not to break existing links if possible, but user wants clean slugs.
            // Let's only update if slug looks like it has a timestamp we want to remove OR if we just blindly update everything to match the new format.
            // User said "you are still using these for previous article", implying they want them fixed.
            // Let's try to generate a clean slug from the title.

            const titleToSlug = article.article_header_en || article.article_header || 'article';
            const baseSlug = titleToSlug
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');

            let newSlug = baseSlug;

            // Check if this article needs an update
            // Strategy: Check if the current slug is ALREADY the clean version.
            if (article.slug === newSlug && article.slug) {
                console.log(`Article "${titleToSlug.substring(0, 20)}..." already has clean slug: ${newSlug}`);
                continue;
            }

            // Uniqueness check loop
            let counter = 1;
            let finalSlug = newSlug;

            // Check if another article (not this one) has this slug
            let collision = await Article.findOne({ slug: finalSlug, _id: { $ne: article._id } });
            while (collision) {
                finalSlug = `${newSlug}-${counter}`;
                counter++;
                collision = await Article.findOne({ slug: finalSlug, _id: { $ne: article._id } });
            }

            // Update
            if (article.slug !== finalSlug) {
                console.log(`Updating slug for "${titleToSlug.substring(0, 20)}...": ${article.slug} -> ${finalSlug}`);
                article.slug = finalSlug;

                // We need to bypass the unique index if we save, but we already checked collision.
                // Note: mongo might throw if we race, but this is a script.
                try {
                    await Article.updateOne({ _id: article._id }, { $set: { slug: finalSlug } });
                } catch (e) {
                    console.error(`Failed to update article ${article._id}: ${e.message}`);
                }
            }
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration Error:', error);
        process.exit(1);
    }
};

updateSlugs();
