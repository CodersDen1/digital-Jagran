const mongoose = require('mongoose');
const Article = require('./models/Article');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const checkArticles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_jagaran');
        console.log('MongoDB Connected to:', mongoose.connection.name); // Logs DB name (likely 'test')

        const articles = await Article.find({}, 'article_header slug _id');
        console.log(`Found ${articles.length} articles.`);

        articles.forEach(a => {
            console.log(`Article: ${a.article_header} | Slug: ${a.slug} | ID: ${a._id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkArticles();
