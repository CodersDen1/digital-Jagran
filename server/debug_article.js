const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_jagaran';

const articleSchema = new mongoose.Schema({
    article_header_en: String,
    storage_type: String,
    html_path_en: String,
    slug: String
}, { strict: false });

const Article = mongoose.model('Article', articleSchema);

async function checkArticle() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Search for the article from the screenshot
        const articles = await Article.find({
            $or: [
                { article_header_en: /Union Budget/i },
                { article_header: /Union Budget/i }
            ]
        });

        if (articles.length === 0) {
            console.log('No "Union Budget" article found.');
        } else {
            articles.forEach(a => {
                console.log('Found Article:');
                console.log(`- ID: ${a._id}`);
                console.log(`- Title: ${a.article_header_en || a.article_header}`);
                console.log(`- Storage Type: ${a.storage_type}`);
                console.log(`- HTML Path: ${a.html_path_en || a.html_path}`);
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkArticle();
