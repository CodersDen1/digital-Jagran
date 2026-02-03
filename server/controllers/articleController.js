const articleRepository = require('../repositories/articleRepository');
const translationService = require('../services/translationService');
const storageService = require('../services/storageService');
const mongoose = require('mongoose');

class ArticleController {
    async injectArticle(req, res) {
        try {
            const { htmlContent, ...metaData } = req.body;

            if (!htmlContent) {
                return res.status(400).json({ error: 'HTML content is required' });
            }

            // 1. Upload HTML to R2
            // Use provided slug or generate one
            let slug = metaData.slug;
            if (!slug) {
                const titleToSlug = metaData.article_header_en || metaData.article_header || 'article';
                slug = titleToSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }
            // Ensure unique slug logic if needed (borrow from createArticle)

            const r2Path = await storageService.uploadArticleHtml(htmlContent, `${slug}-${metaData.published_language || 'en'}`);

            // 2. Prepare Article Data
            const articleData = {
                ...metaData,
                slug,
                html_path: r2Path,
                html_path_en: r2Path, // Defaulting to EN for now or based on language
                storage_type: 'html',
                is_Published: true, // Default to published for injected
                views: 0
            };

            // 3. Create Default Freeform Layout Wrapper
            // We create a "fake" layout that wraps this HTML so it can be opened in the editor
            // Ideally, we'd want a special "HTML Block" element in the editor.
            // For now, let's just create the article and let the editor handle 'html' storage type logic 
            // (Editor already checks storage_type='html' and loads content, but we might need a layout to represent it?)
            // Actually, if we just save the article, the editor might need a 'layoutTemplate' reference.
            // Let's create a blank freeform layout linked to this article if needed, or just leave it empty.
            // If we leave it empty, the editor might fail to load.
            // Let's use the 'default' layout or generate a new one.

            // Allow duplicate slug update
            let article = await articleRepository.findBySlug(slug);
            if (article) {
                Object.assign(article, articleData);
                await article.save();
            } else {
                article = await articleRepository.create(articleData);
            }

            res.status(200).json(article);
        } catch (error) {
            console.error('Injection error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async createArticle(req, res) {
        try {
            const articleData = req.body;

            // SEO: Generate Slug if not provided
            // SEO: Generate Clean Slug if not provided
            if (!articleData.slug) {
                const titleToSlug = articleData.article_header_en || articleData.article_header || 'article';
                const baseSlug = titleToSlug
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)+/g, '');

                let slug = baseSlug;
                let counter = 1;

                // Simple collision check (best effort, robust check handles error 11000)
                // Ideally we check DB here, but to avoid extra query we rely on error handling or simple loop if we want to be nice.
                // For now, let's just default to the clean slug. If it conflicts, the client gets an error (duplicate key),
                // but for better UX let's try to find a unique one if possible or just use timestamp as fallback if simpler?
                // The user specifically asked for "hello-this-is-me".
                // Let's implement a uniqueness check helper logic here or just rely on 'baseSlug' and if error 11000 caught, we retry?
                // Actually, doing a quick check is better.

                const existing = await articleRepository.findBySlug(slug);
                if (existing) {
                    // If exists, try appending count
                    while (await articleRepository.findBySlug(slug)) {
                        slug = `${baseSlug}-${counter}`;
                        counter++;
                    }
                }

                articleData.slug = slug;
            }

            // SEO: Default Meta Title
            if (!articleData.metaTitle) {
                articleData.metaTitle = articleData.article_header_en || articleData.article_header;
            }

            // SEO: Default Meta Description
            if (!articleData.metaDescription) {
                const summary = articleData.summary_en || articleData.summary || '';
                articleData.metaDescription = summary.substring(0, 160);
            }

            // Handle HTML Storage (English)
            if (articleData.htmlContent_en) {
                const path = await storageService.uploadArticleHtml(articleData.htmlContent_en, `${articleData.slug}-en`);
                articleData.html_path_en = path;
                articleData.storage_type = 'html';
                // Remove raw content if it was passed just for upload (optional, but good practice if not in schema)
                delete articleData.htmlContent_en;
            }

            // Handle HTML Storage (Hindi)
            if (articleData.htmlContent) {
                const path = await storageService.uploadArticleHtml(articleData.htmlContent, `${articleData.slug}-hi`);
                articleData.html_path = path;
                articleData.storage_type = 'html';
                delete articleData.htmlContent;
            }

            // Create single article based on payload (Language is decided by client)
            const newArticle = await articleRepository.create(articleData);
            res.status(201).json(newArticle);
        } catch (error) {
            // Handle duplicate key error for slug
            if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
                return res.status(400).json({ error: 'Slug must be unique.' });
            }
            res.status(500).json({ error: error.message });
        }
    }

    async translateArticle(req, res) {
        try {
            const { id } = req.params;
            const { targetLanguage } = req.body; // Expect 'en' or 'HN' (or 'hi')

            const originalArticle = await articleRepository.findById(id);
            if (!originalArticle) {
                return res.status(404).json({ error: 'Article not found' });
            }

            // Determine target language code
            const targetLangCode = targetLanguage || (originalArticle.published_language === 'en' ? 'HN' : 'en');

            // Create a skeleton for the new article
            const newArticleData = {
                ...originalArticle.toObject(),
                _id: undefined, // New ID
                createdAt: undefined,
                updatedAt: undefined,
                published_language: targetLangCode,
                isTranslating: true,
                article_header: targetLangCode === 'en' ? (originalArticle.article_header || originalArticle.article_header_en) : 'Translating...',
                summary: targetLangCode === 'en' ? (originalArticle.summary || originalArticle.summary_en) : 'Translating content...',
                body: targetLangCode === 'en' ? (originalArticle.body || originalArticle.body_en) : 'Please wait, content is being translated.',
                article_header_en: targetLangCode === 'en' ? 'Translating...' : (originalArticle.article_header_en || originalArticle.article_header),
                summary_en: targetLangCode === 'en' ? undefined : (originalArticle.summary_en || originalArticle.summary),
                body_en: targetLangCode === 'en' ? undefined : (originalArticle.body_en || originalArticle.body),

                // RESET STATS
                views: 0,

                // Clear element content to avoid showing original language text while translating
                elementContent_en: targetLangCode === 'en' ? {} : (originalArticle.elementContent_en || originalArticle.elementContent),

                // Regenerate slug for the translated article to avoid collision
                slug: (originalArticle.slug || 'article') + '-' + targetLangCode + '-' + Date.now()
            };

            const newArticle = await articleRepository.create(newArticleData);

            // Respond immediately with the new skeleton article
            res.status(201).json(newArticle);

            // Perform Async Translation
            (async () => {
                try {
                    console.log(`Starting background translation for Article ID: ${newArticle._id} to ${targetLangCode}`);

                    let translations = {};
                    if (targetLangCode === 'HN' || targetLangCode === 'hi') {
                        translations = await translationService.getHindiTranslation(originalArticle);
                    } else if (targetLangCode === 'en') {
                        translations = await translationService.getEnglishTranslation(originalArticle);
                    } else {
                        console.log("Translation not supported for language:", targetLangCode);
                    }

                    if (Object.keys(translations).length > 0) {
                        await articleRepository.update(newArticle._id, {
                            ...translations,
                            isTranslating: false
                        });
                        console.log(`Translation completed for Article ID: ${newArticle._id}`);
                    } else {
                        await articleRepository.update(newArticle._id, {
                            isTranslating: false,
                            article_header: "Translation returned empty result"
                        });
                    }

                } catch (err) {
                    console.error("Background translation failed:", err);
                    await articleRepository.update(newArticle._id, {
                        article_header: "Translation Failed",
                        isTranslating: false
                    });
                }
            })();

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAllArticles(req, res) {
        try {
            const articles = await articleRepository.findAll();

            // Disable caching
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            res.set('Surrogate-Control', 'no-store');

            res.status(200).json(articles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getArticleById(req, res) {
        try {
            let article;
            if (mongoose.Types.ObjectId.isValid(req.params.id)) {
                article = await articleRepository.findById(req.params.id);
            }

            if (!article) {
                article = await articleRepository.findBySlug(req.params.id);

                // Optimization: If fetching by SLUG (Client Viewer), and HTML exists, 
                // don't send the heavy JSON source (elements/layout) to the client.
                if (article && article.storage_type === 'html') {
                    // Convert to POJO to allow modification
                    article = article.toObject ? article.toObject() : article;

                    // Remove heavy editorial data not needed for HTML rendering
                    delete article.elements;
                    delete article.elementContent;
                    delete article.elementContent_en;
                    delete article.layoutTemplate;
                }
            }

            if (!article) return res.status(404).json({ message: 'Article not found' });

            // Disable caching for this specific response
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            res.set('Surrogate-Control', 'no-store'); // For CDNs

            res.status(200).json(article);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async duplicateArticle(req, res) {
        try {
            const originalArticle = await articleRepository.findById(req.params.id);
            if (!originalArticle) {
                return res.status(404).json({ error: 'Article not found' });
            }

            const newArticleData = {
                ...originalArticle.toObject(),
                _id: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                views: 0,
                is_Published: false, // Default to draft
                is_Drafted: true,
                article_header: originalArticle.article_header ? `${originalArticle.article_header} (Copy)` : undefined,
                article_header_en: originalArticle.article_header_en ? `${originalArticle.article_header_en} (Copy)` : undefined,
                slug: `${originalArticle.slug}-copy-${Date.now()}`
            };

            const newArticle = await articleRepository.create(newArticleData);
            res.status(201).json(newArticle);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateArticle(req, res) {
        try {
            const updates = req.body;

            // SEO: Update slug if title changes and slug is not explicitly provided (optional logic, kept simple for now)
            // For now, only auto-generate slug on creation to preserve URLs.
            // If user wants to update slug, they must send it explicitly.

            // SEO: Default Meta Title sync (optional, only if metaTitle is empty)
            // SEO: Default Meta Title sync (optional, only if metaTitle is empty)
            if (updates.article_header_en && !updates.metaTitle) {
                updates.metaTitle = updates.article_header_en;
            }

            // Ensure we don't lose the ID or creation date if not provided
            delete updates._id;
            delete updates.createdAt;
            updates.updatedAt = new Date();

            // Handle HTML Storage Updates
            // We need the current slug to generate the path. 
            // If slug is being updated in this request, use new slug. Else we might need to fetch the existing article?
            // For now, assume slug is present in updates OR we fetch it.
            // But updateArticle uses `articleRepository.replace` or `update`. 
            // If we're just patching, we might not have the slug.
            // Let's first fetch the article to get the slug if not in updates.

            let currentSlug = updates.slug;
            if (!currentSlug && (updates.htmlContent_en || updates.htmlContent)) {
                const existing = await articleRepository.findById(req.params.id);
                if (existing) currentSlug = existing.slug;
            }

            if (currentSlug) {
                if (updates.htmlContent_en) {
                    const path = await storageService.uploadArticleHtml(updates.htmlContent_en, `${currentSlug}-en`);
                    updates.html_path_en = path;
                    updates.storage_type = 'html';
                    delete updates.htmlContent_en;
                }
                if (updates.htmlContent) {
                    const path = await storageService.uploadArticleHtml(updates.htmlContent, `${currentSlug}-hi`);
                    updates.html_path = path;
                    updates.storage_type = 'html';
                    delete updates.htmlContent;
                }
            }

            const updatedArticle = await articleRepository.replace(req.params.id, updates);
            if (!updatedArticle) return res.status(404).json({ message: 'Article not found' });
            res.status(200).json(updatedArticle);
        } catch (error) {
            if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
                return res.status(400).json({ error: 'Slug must be unique.' });
            }
            res.status(500).json({ error: error.message });
        }
    }

    async deleteArticle(req, res) {
        try {
            const deletedArticle = await articleRepository.delete(req.params.id);
            if (!deletedArticle) return res.status(404).json({ message: 'Article not found' });
            res.status(200).json({ message: 'Article deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async bulkDeleteArticles(req, res) {
        try {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'No article IDs provided' });
            }
            await articleRepository.deleteMany(ids);
            res.status(200).json({ message: 'Articles deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async incrementViews(req, res) {
        try {
            const article = await articleRepository.incrementViews(req.params.id);
            if (!article) return res.status(404).json({ message: 'Article not found' });
            res.status(200).json({ views: article.views });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTrendingArticles(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const articles = await articleRepository.findTrending(limit);

            // Disable caching
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            res.set('Surrogate-Control', 'no-store');

            res.status(200).json(articles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getArticleHtml(req, res) {
        try {
            const { id } = req.params;
            const lang = req.query.lang || 'en';

            let article;
            if (mongoose.Types.ObjectId.isValid(id)) {
                article = await articleRepository.findById(id);
            }
            if (!article) {
                article = await articleRepository.findBySlug(id);
            }

            if (!article) return res.status(404).json({ message: 'Article not found' });

            const key = lang === 'en' ? article.html_path_en : article.html_path;

            if (!key) {
                return res.status(404).json({ message: 'HTML content not found for this language' });
            }

            const stream = await storageService.getArticleHtml(key);

            res.setHeader('Content-Type', 'text/html');
            // Assuming stream is readable
            stream.pipe(res);
        } catch (error) {
            console.error('Error serving HTML:', error);
            res.status(500).json({ error: 'Failed to retrieve content' });
        }
    }
}

module.exports = new ArticleController();
