const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const articleController = require('./controllers/articleController');
const layoutController = require('./controllers/layoutController');
const freeformLayoutController = require('./controllers/freeformLayoutController');
const sitemapController = require('./controllers/sitemapController');
const seoController = require('./controllers/seoController');
const cacheService = require('./services/cacheService');

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
            callback(null, false);
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

// Gzip/Brotli compression for all responses (huge perf win)
app.use(compression({
    level: 6,
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// JSON body parser with size limit (replaces deprecated body-parser)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_jagaran')
    .then(async () => {
        console.log('MongoDB Connected');
        // Precache articles into L1 (node-cache) + L2 (Redis) on startup
        try {
            const articleRepository = require('./repositories/articleRepository');
            await cacheService.precacheArticles(
                () => articleRepository.findPublished(),
                () => articleRepository.findPublishedLight(),
                (limit) => articleRepository.findTrending(limit)
            );
        } catch (err) {
            console.error('Precache on startup failed:', err.message);
        }
    })
    .catch(err => console.error('MongoDB Connection Error:', err));

// Article Routes
const articleRouter = express.Router();
articleRouter.post('/articles/inject', (req, res) => articleController.injectArticle(req, res));
articleRouter.post('/articles', (req, res) => articleController.createArticle(req, res));
articleRouter.get('/articles', (req, res) => articleController.getAllArticles(req, res));
articleRouter.get('/articles/published', (req, res) => articleController.getPublishedArticles(req, res));
articleRouter.get('/articles/trending', (req, res) => articleController.getTrendingArticles(req, res));
articleRouter.get('/articles/:id', (req, res) => articleController.getArticleById(req, res));
articleRouter.get('/articles/:id/content', (req, res) => articleController.getArticleHtml(req, res));
articleRouter.put('/articles/:id', (req, res) => articleController.updateArticle(req, res));
articleRouter.delete('/articles/:id', (req, res) => articleController.deleteArticle(req, res));
articleRouter.post('/articles/bulk-delete', (req, res) => articleController.bulkDeleteArticles(req, res));
articleRouter.post('/articles/:id/view', (req, res) => articleController.incrementViews(req, res));
articleRouter.post('/articles/:id/translate', (req, res) => articleController.translateArticle(req, res));
articleRouter.post('/articles/:id/duplicate', (req, res) => articleController.duplicateArticle(req, res));

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
layoutRouter.post('/layouts/:id/elements/:elementId/duplicate', (req, res) => layoutController.duplicateElement(req, res));

app.use('/api', articleRouter);
app.use('/api', layoutRouter);

// Freeform Layout Routes (New Legacy Editor)
const freeformLayoutRouter = express.Router();
freeformLayoutRouter.post('/freeform-layouts', (req, res) => freeformLayoutController.createFreeformLayout(req, res));
freeformLayoutRouter.get('/freeform-layouts', (req, res) => freeformLayoutController.getAllFreeformLayouts(req, res));
freeformLayoutRouter.get('/freeform-layouts/default', (req, res) => freeformLayoutController.getDefaultFreeformLayout(req, res));
freeformLayoutRouter.get('/freeform-layouts/:id', (req, res) => freeformLayoutController.getFreeformLayoutById(req, res));
freeformLayoutRouter.put('/freeform-layouts/:id', (req, res) => freeformLayoutController.updateFreeformLayout(req, res));
freeformLayoutRouter.post('/freeform-layouts/bulk-delete', (req, res) => freeformLayoutController.bulkDeleteFreeformLayouts(req, res));
freeformLayoutRouter.delete('/freeform-layouts/:id', (req, res) => freeformLayoutController.deleteFreeformLayout(req, res));
freeformLayoutRouter.put('/freeform-layouts/:id/set-default', (req, res) => freeformLayoutController.setDefaultFreeformLayout(req, res));
freeformLayoutRouter.post('/freeform-layouts/:id/duplicate', (req, res) => freeformLayoutController.duplicateFreeformLayout(req, res));
freeformLayoutRouter.patch('/freeform-layouts/:id/canvas', (req, res) => freeformLayoutController.saveCanvasState(req, res));
app.use('/api', freeformLayoutRouter);

// Sitemap Route (Root level)
app.get('/sitemap.xml', (req, res) => sitemapController.generateSitemap(req, res));

// SEO SSR Route (For Crawlers)
app.get('/article-seo/:slug', (req, res) => seoController.serveArticleSeo(req, res));

// Cache Stats Route (for monitoring)
app.get('/api/cache/stats', (req, res) => {
    res.json(cacheService.getStats());
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
