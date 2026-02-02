const mongoose = require('mongoose');
const Article = require('./models/Article');
require('dotenv').config();

console.log("Starting connection test...");
console.log("URI:", process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_jagaran');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_jagaran')
    .then(async () => {
        console.log('MongoDB Connected');
        const count = await Article.countDocuments();
        console.log(`Article count: ${count}`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection Error:', err);
        process.exit(1);
    });
