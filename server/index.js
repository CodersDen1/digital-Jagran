const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const articleController = require('./controllers/articleController');
const layoutController = require('./controllers/layoutController');
const sitemapController = require('./controllers/sitemapController');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5001',
    'https://digitaljagran.com',
    'https://www.digitaljagran.com',
    'https://crm.digitaljagran.com',
    'https://server.digitaljagran.com',
    'https://cms.digitaljagran.com',
    'https://dev.digitaljagran.com'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(null, true); // Allow all origins in production for now, log blocked ones
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400 // 24 hours preflight cache
};

// Middleware - CORS must be first
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options(/.*/, cors(corsOptions));

app.use(bodyParser.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_jagaran')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Article Routes
const articleRouter = express.Router();
articleRouter.post('/articles', (req, res) => articleController.createArticle(req, res));
articleRouter.get('/articles', (req, res) => articleController.getAllArticles(req, res));
articleRouter.get('/articles/trending', (req, res) => articleController.getTrendingArticles(req, res));
articleRouter.get('/articles/:id', (req, res) => articleController.getArticleById(req, res));
articleRouter.put('/articles/:id', (req, res) => articleController.updateArticle(req, res));
articleRouter.delete('/articles/:id', (req, res) => articleController.deleteArticle(req, res));
articleRouter.post('/articles/bulk-delete', (req, res) => articleController.bulkDeleteArticles(req, res));
articleRouter.post('/articles/:id/view', (req, res) => articleController.incrementViews(req, res));
articleRouter.post('/articles/:id/translate', (req, res) => articleController.translateArticle(req, res));

// Layout Routes
const layoutRouter = express.Router();
layoutRouter.post('/layouts', (req, res) => layoutController.createLayout(req, res));
layoutRouter.get('/layouts', (req, res) => layoutController.getAllLayouts(req, res));
layoutRouter.get('/layouts/default', (req, res) => layoutController.getDefaultLayout(req, res));
layoutRouter.get('/layouts/:id', (req, res) => layoutController.getLayoutById(req, res));
layoutRouter.put('/layouts/:id', (req, res) => layoutController.updateLayout(req, res));
layoutRouter.delete('/layouts/:id', (req, res) => layoutController.deleteLayout(req, res));
layoutRouter.put('/layouts/:id/set-default', (req, res) => layoutController.setDefaultLayout(req, res));
layoutRouter.post('/layouts/:id/duplicate', (req, res) => layoutController.duplicateLayout(req, res));

app.use('/api', articleRouter);
app.use('/api', layoutRouter);

// Sitemap Route (Root level)
app.get('/sitemap.xml', (req, res) => sitemapController.generateSitemap(req, res));

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
