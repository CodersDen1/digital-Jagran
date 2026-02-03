import React from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { articleService, layoutService, freeformLayoutService } from '../../services/api';
import { ReactTransliterate } from "react-transliterate";
import "react-transliterate/dist/index.css";
import Layout from '../common/Layout';
import Button from '../common/Button';
import { Palette, Settings, Image, Video, Tag, FileText, Upload } from 'lucide-react';

/**
 * InlineArticleEditor - WYSIWYG-style article editor where inputs are directly in the layout
 */
const CreateArticle = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Get article ID from URL for edit mode
    const isEditMode = Boolean(id);
    const [formData, setFormData] = useState({
        article_header: '', // Generic key
        metadata: '',
        keywords: '',
        summary: '',
        body: '',
        tags: '',
        photos: '',
        video: '',
        is_Published: false,
        author: 'Nisha Mishra',
        layoutTemplate: '',
        slug: ''
    });
    // Track content by element ID
    const [elementData, setElementData] = useState({});
    const [loading, setLoading] = useState(false);
    const [layouts, setLayouts] = useState([]);
    const [showSettings, setShowSettings] = useState(false);

    // Language State ('en' or 'HN')
    const [language, setLanguage] = useState('en');
    const isHindi = language === 'HN';

    // Get the currently selected layout object
    const selectedLayout = layouts.find(l => l._id === formData.layoutTemplate) || null;

    useEffect(() => {
        loadLayouts();
    }, []);

    // Load article data when in edit mode
    useEffect(() => {
        if (isEditMode && id) {
            loadArticle();
        }
    }, [id, isEditMode]);

    const loadArticle = async () => {
        try {
            setLoading(true);
            const article = await articleService.getById(id);

            // Determine language from existing article
            // Map 'hi' -> 'HN' for consistency
            const articleLang = article.published_language === 'hi' ? 'HN' : (article.published_language || 'en');
            setLanguage(articleLang);

            // Helper to get field based on language
            const getField = (enField, hiField) => {
                return articleLang === 'en' ? article[enField] : (article[hiField] || '');
            };

            setFormData({
                article_header: getField('article_header_en', 'article_header') || '',
                metadata: getField('metadata_en', 'metadata') || '',
                keywords: Array.isArray(getField('keywords_en', 'keywords'))
                    ? getField('keywords_en', 'keywords').join(', ')
                    : (getField('keywords_en', 'keywords') || ''),
                summary: getField('summary_en', 'summary') || '',
                body: getField('body_en', 'body') || '',
                tags: Array.isArray(getField('tags_en', 'tags'))
                    ? getField('tags_en', 'tags').join(', ')
                    : (getField('tags_en', 'tags') || ''),
                photos: Array.isArray(article.photos) ? article.photos.join(', ') : (article.photos || ''),
                video: article.video || '',
                is_Published: article.is_Published || false,
                author: article.author || 'Nisha Mishra',
                layoutTemplate: article.layoutTemplate || '',
                slug: article.slug || ''
            });
            // Load element-specific content if it exists (legacy check for en, eventually generic)
            if (article.elementContent_en) {
                setElementData(article.elementContent_en);
            }
        } catch (error) {
            console.error('Error loading article:', error);
            alert('Failed to load article');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const loadLayouts = async () => {
        try {
            // Fetch both grid and freeform layouts
            const [gridLayouts, freeformLayouts] = await Promise.all([
                layoutService.getAll(),
                freeformLayoutService.getAll()
            ]);

            // Mark each with its type
            const allLayouts = [
                ...gridLayouts.map(l => ({ ...l, layoutType: 'grid' })),
                ...freeformLayouts.map(l => ({ ...l, layoutType: 'freeform' }))
            ];

            setLayouts(allLayouts);

            if (!isEditMode) {
                const defaultLayout = allLayouts.find(l => l.isDefault);
                if (defaultLayout) {
                    setFormData(prev => ({ ...prev, layoutTemplate: defaultLayout._id }));
                }
            }
        } catch (error) {
            console.error('Error loading layouts:', error);
        }
    };

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle change for specific element by ID (for layouts with duplicate types)
    const handleElementChange = (elementId, elementType, value) => {
        setElementData(prev => ({
            ...prev,
            [elementId]: { type: elementType, value }
        }));
    };

    // Get value for an element - first check elementData by ID, then fall back to formData by type
    const getElementValue = (element) => {
        if (elementData[element.id]?.value !== undefined) {
            return elementData[element.id].value;
        }
        const typeToField = {
            'header': 'article_header',
            'summary': 'summary',
            'body': 'body',
            'author': 'author',
            'tags': 'tags',
            'image': 'photos',
            'video': 'video'
        };
        return formData[typeToField[element.type]] || '';
    };

    // Helper to get element metadata (like objectPosition)
    const getElementMetadata = (elementId, key) => {
        return elementData[elementId]?.[key];
    };

    // Update specific metadata for an element
    const handleElementMetadataChange = (elementId, key, value) => {
        setElementData(prev => ({
            ...prev,
            [elementId]: {
                ...(prev[elementId] || {}),
                [key]: value
            }
        }));
    };

    // Consolidate element data by type for submission
    const consolidateElementData = () => {
        const result = { ...formData };

        // Group element values by type
        const typeToField = {
            'header': 'article_header',
            'summary': 'summary',
            'body': 'body',
            'author': 'author',
            'tags': 'tags',
            'image': 'photos',
            'video': 'video'
        };

        // Collect all values by type
        const valuesByType = {};
        Object.values(elementData).forEach(({ type, value }) => {
            if (value && value.trim()) {
                if (!valuesByType[type]) {
                    valuesByType[type] = [];
                }
                valuesByType[type].push(value);
            }
        });

        // Merge into result
        Object.entries(valuesByType).forEach(([type, values]) => {
            const fieldName = typeToField[type];
            if (fieldName) {
                if (type === 'body') {
                    result[fieldName] = values.join('\n\n');
                } else if (type === 'header') {
                    result[fieldName] = values[0]; // First header is main
                } else if (type === 'image') {
                    result[fieldName] = values.join(',');
                } else {
                    result[fieldName] = values[0];
                }
            }
        });

        return result;
    };

    const [lastSavedData, setLastSavedData] = useState(null);
    const [isDirty, setIsDirty] = useState(false);
    const [autosaveStatus, setAutosaveStatus] = useState(''); // 'Saving...', 'Saved', 'Error'

    // Deep compare to check for changes
    useEffect(() => {
        if (!lastSavedData) {
            setLastSavedData(JSON.stringify({ formData, elementData }));
            return;
        }

        const currentData = JSON.stringify({ formData, elementData });
        if (currentData !== lastSavedData) {
            setIsDirty(true);
            setAutosaveStatus('Unsaved changes');
        }
    }, [formData, elementData]);

    // Autosave Timer
    useEffect(() => {
        if (!isDirty || loading) return;

        const timer = setTimeout(() => {
            handleAutosave();
        }, 30000); // Autosave every 30 seconds

        return () => clearTimeout(timer);
    }, [isDirty, formData, elementData, loading]);

    const handleAutosave = async () => {
        if (!isDirty) return;

        setAutosaveStatus('Saving...');

        try {
            const mergedData = consolidateElementData();

            // Construct payload (Reuse logic from handleSubmit but force draft)
            const payload = {
                photos: mergedData.photos.split(',').map(s => s.trim()).filter(Boolean),
                video: mergedData.video,
                is_Drafted: true, // Always draft on autosave
                is_Published: false, // Never publish on autosave
                author: mergedData.author,
                layoutTemplate: mergedData.layoutTemplate || undefined,
                published_language: language,
                elementContent_en: elementData,
                slug: mergedData.slug
            };

            const isEn = language === 'en';
            if (isEn) {
                payload.article_header_en = mergedData.article_header;
                payload.summary_en = mergedData.summary;
                payload.body_en = mergedData.body;
                payload.metadata_en = mergedData.metadata;
                payload.keywords_en = mergedData.keywords.split(',').map(s => s.trim());
                payload.tags_en = mergedData.tags.split(',').map(s => s.trim());
            } else {
                payload.article_header = mergedData.article_header;
                payload.summary = mergedData.summary;
                payload.body = mergedData.body;
                payload.metadata = mergedData.metadata;
                payload.keywords = mergedData.keywords.split(',').map(s => s.trim());
                payload.tags = mergedData.tags.split(',').map(s => s.trim());
            }

            if (isEditMode) {
                await articleService.update(id, payload);
            } else {
                // For new articles, we need to create first, then redirect to edit mode to allow future updates
                const newArticle = await articleService.create(payload);
                // Update URL to edit mode without reload
                window.history.replaceState(null, '', `/edit/${newArticle._id}`);
                // Ideally we should update the 'id' param but React Router won't update automatically
                // For now, simple autosave works best on existing articles
                // If it was a new article, we might want to just notify user or handle state carefully
            }

            setLastSavedData(JSON.stringify({ formData, elementData }));
            setIsDirty(false);
            setAutosaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);

            // Clear status after 3 seconds
            setTimeout(() => {
                if (autosaveStatus.startsWith('Saved')) {
                    // setAutosaveStatus(''); 
                }
            }, 3000);

        } catch (error) {
            console.error('Autosave failed:', error);
            setAutosaveStatus('Autosave Failed');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const mergedData = consolidateElementData();

        // Construct final payload mapping generic fields to Language-Specific fields
        const payload = {
            // Unmapped fields
            photos: mergedData.photos.split(',').map(s => s.trim()).filter(Boolean),
            video: mergedData.video,
            is_Drafted: !mergedData.is_Published,
            is_Published: mergedData.is_Published,
            author: mergedData.author,
            layoutTemplate: mergedData.layoutTemplate || undefined,
            published_language: language, // Explicitly set language
            elementContent_en: elementData, // Keep structure (legacy name ok for now)
            slug: mergedData.slug
        };

        // Map textual fields based on selected language
        const isEn = language === 'en';

        if (isEn) {
            payload.article_header_en = mergedData.article_header;
            payload.summary_en = mergedData.summary;
            payload.body_en = mergedData.body;
            payload.metadata_en = mergedData.metadata;
            payload.keywords_en = mergedData.keywords.split(',').map(s => s.trim());
            payload.tags_en = mergedData.tags.split(',').map(s => s.trim());
        } else {
            // Hindi/Other
            payload.article_header = mergedData.article_header;
            payload.summary = mergedData.summary;
            payload.body = mergedData.body;
            payload.metadata = mergedData.metadata;
            payload.keywords = mergedData.keywords.split(',').map(s => s.trim());
            payload.tags = mergedData.tags.split(',').map(s => s.trim());
        }

        try {
            if (isEditMode) {
                await articleService.update(id, payload);
                alert('Article Updated Successfully!');
            } else {
                await articleService.create(payload);
                alert('Article Created Successfully!');
            }
            navigate('/');
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || (isEditMode ? 'Failed to update article' : 'Failed to create article');
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    // Import HTML Handler
    const fileInputRef = React.useRef(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const htmlContent = event.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            const updates = {};

            // 1. Title/Headline
            const h1 = doc.querySelector('h1');
            const title = doc.querySelector('title');
            if (h1) {
                updates.article_header = h1.innerText;
            } else if (title) {
                updates.article_header = title.innerText;
            }

            // 2. Metadata & Keywords
            const metaDesc = doc.querySelector('meta[name="description"]');
            if (metaDesc) updates.summary = metaDesc.content;
            if (metaDesc) updates.metadata = metaDesc.content;

            const metaKeywords = doc.querySelector('meta[name="keywords"]');
            if (metaKeywords) updates.keywords = metaKeywords.content;

            // 3. Body Content & Styles
            // Extract styles
            const styles = Array.from(doc.querySelectorAll('style')).map(s => s.outerHTML).join('\n');

            // Get body content (excluding scripts usually, but preserving structure)
            const body = doc.body;

            // Remove scripts from import to be safe(r) and cleaner
            const scripts = body.querySelectorAll('script');
            scripts.forEach(s => s.remove());

            // Combine styles + body
            // We prepend styles so they apply to this content
            updates.body = `${styles}\n${body.innerHTML}`;

            // Update state
            setFormData(prev => ({
                ...prev,
                ...updates
            }));

            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';

            alert('HTML Imported Successfully! Please review the content.');
        };
        reader.readAsText(file);
    };

    // Generate CSS classes from config (Layout/Spacing only)
    const getConfigStyles = (config) => {
        if (!config) return '';
        const classes = [];

        if (config.paddingTop && config.paddingTop !== '0') classes.push(`pt-${config.paddingTop}`);
        if (config.paddingBottom && config.paddingBottom !== '0') classes.push(`pb-${config.paddingBottom}`);
        if (config.paddingLeft && config.paddingLeft !== '0') classes.push(`pl-${config.paddingLeft}`);
        if (config.paddingRight && config.paddingRight !== '0') classes.push(`pr-${config.paddingRight}`);
        if (config.marginTop && config.marginTop !== '0') classes.push(`mt-${config.marginTop}`);
        if (config.marginBottom && config.marginBottom !== '0') classes.push(`mb-${config.marginBottom}`);
        if (config.borderLeft) {
            classes.push(`border-l-4 border-${config.borderColor || 'gray-300'}`);
        }

        return classes.join(' ');
    };

    // Generate Inline Styles for Typography/Colors
    const getInlineStyles = (config) => {
        if (!config) return {};

        const styles = {};

        // Typography
        if (config.fontSize) {
            const sizes = {
                'xs': '0.75rem', 'sm': '0.875rem', 'base': '1rem', 'lg': '1.125rem',
                'xl': '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem'
            };
            styles.fontSize = sizes[config.fontSize] || '1rem';
        }
        if (config.fontWeight) styles.fontWeight = config.fontWeight;
        if (config.textAlign) styles.textAlign = config.textAlign;
        if (config.lineHeight) {
            const heights = { 'tight': 1.25, 'normal': 1.5, 'relaxed': 1.625, 'loose': 2 };
            styles.lineHeight = heights[config.lineHeight] || 1.5;
        }

        // Colors
        if (config.textColor) styles.color = config.textColor;

        // Font Family
        if (config.fontFamily) {
            const map = {
                'sans': 'ui-sans-serif, system-ui, sans-serif',
                'serif': 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
                'mono': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                'times': '"Times New Roman", Times, serif',
                'arial': 'Arial, Helvetica, sans-serif',
                'verdana': 'Verdana, Geneva, Tahoma, sans-serif',
                'georgia': 'Georgia, serif',
                'courier': '"Courier New", Courier, monospace',
                'trebuchet': '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", "Lucida Sans", Arial, sans-serif',
                'helvetica': 'Helvetica, Arial, sans-serif'
            };
            styles.fontFamily = map[config.fontFamily] || 'inherit';
        }

        // Advanced Text
        if (config.textDecoration) styles.textDecoration = config.textDecoration;
        if (config.textTransform) styles.textTransform = config.textTransform;
        if (config.letterSpacing) {
            const map = {
                'tighter': '-0.05em', 'tight': '-0.025em', 'normal': '0',
                'wide': '0.025em', 'wider': '0.05em', 'widest': '0.1em'
            };
            styles.letterSpacing = map[config.letterSpacing] || 'normal';
        }
        if (config.fontStyle) styles.fontStyle = config.fontStyle;

        // Box Shadow
        if (config.boxShadow) {
            const map = {
                'none': 'none',
                'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)'
            };
            styles.boxShadow = map[config.boxShadow] || 'none';
        }

        return styles;
    };

    // Render inline input for each element type - uses element.id for independent values
    const renderInlineInput = (element) => {
        const { id, type, config } = element;
        const configStyles = getConfigStyles(config);
        const inlineStyles = getInlineStyles(config);
        const elementValue = getElementValue(element);
        const isHindi = language === 'HN';

        switch (type) {
            case 'header':
                return (
                    <div className={`${configStyles} group relative`}>
                        {isHindi ? (
                            <ReactTransliterate
                                value={elementValue}
                                onChangeText={(text) => handleElementChange(id, type, text)}
                                lang="hi"
                                placeholder="Click to enter headline..."
                                className="w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2"
                                containerClassName="w-full"
                                style={{ ...inlineStyles }}
                            />
                        ) : (
                            <input
                                type="text"
                                value={elementValue}
                                onChange={(e) => handleElementChange(id, type, e.target.value)}
                                placeholder="Click to enter headline..."
                                className="w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2"
                                style={{ ...inlineStyles }}
                            />
                        )}
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                            Headline
                        </span>
                    </div>
                );

            case 'summary':
                return (
                    <div className={`${configStyles} group relative`}>
                        {isHindi ? (
                            <ReactTransliterate
                                value={elementValue}
                                onChangeText={(text) => handleElementChange(id, type, text)}
                                lang="hi"
                                placeholder="Click to enter summary..."
                                className="w-full bg-transparent border-none outline-none text-gray-600 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-none"
                                containerClassName="w-full"
                                style={{ ...inlineStyles }}
                                renderComponent={(props) => <textarea {...props} rows={3} />}
                            />
                        ) : (
                            <textarea
                                value={elementValue}
                                onChange={(e) => handleElementChange(id, type, e.target.value)}
                                placeholder="Click to enter summary..."
                                rows={3}
                                className="w-full bg-transparent border-none outline-none text-gray-600 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-none"
                                style={{ ...inlineStyles }}
                            />
                        )}
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                            Summary
                        </span>
                    </div>
                );

            case 'body':
                return (
                    <div className={`${configStyles} group relative`}>
                        {isHindi ? (
                            <ReactTransliterate
                                value={elementValue}
                                onChangeText={(text) => handleElementChange(id, type, text)}
                                lang="hi"
                                placeholder="Click to write article body content..."
                                className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-y min-h-[200px]"
                                containerClassName="w-full"
                                style={{ ...inlineStyles }}
                                renderComponent={(props) => <textarea {...props} rows={10} />}
                            />
                        ) : (
                            <textarea
                                value={elementValue}
                                onChange={(e) => handleElementChange(id, type, e.target.value)}
                                placeholder="Click to write article body content..."
                                rows={10}
                                className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-y min-h-[200px]"
                                style={{ ...inlineStyles }}
                            />
                        )}
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                            Body Content
                        </span>
                    </div>
                );

            case 'author':
                return (
                    <div className={`${configStyles} flex items-center gap-3 group relative`}>
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                            {elementValue?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1">
                            {isHindi ? (
                                <ReactTransliterate
                                    value={elementValue}
                                    onChangeText={(text) => handleElementChange(id, type, text)}
                                    lang="hi"
                                    placeholder="Author name..."
                                    className="w-full bg-transparent border-none outline-none font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-1"
                                    containerClassName="w-full"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={elementValue}
                                    onChange={(e) => handleElementChange(id, type, e.target.value)}
                                    placeholder="Author name..."
                                    className="w-full bg-transparent border-none outline-none font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-1"
                                />
                            )}
                            <div className="text-xs text-gray-500">Author</div>
                        </div>
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                            Author
                        </span>
                    </div>
                );

            case 'date':
                return (
                    <div className={`${configStyles} flex items-center gap-2 text-gray-500`}>
                        <span>{new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</span>
                    </div>
                );

            case 'tags':
                return (
                    <div className={`${configStyles} group relative`}>
                        <div className="flex flex-wrap gap-2 items-center">
                            {elementValue ? (
                                elementValue.split(',').map((tag, idx) => (
                                    tag.trim() && (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full"
                                        >
                                            {tag.trim()}
                                        </span>
                                    )
                                ))
                            ) : null}
                            {isHindi ? (
                                <ReactTransliterate
                                    value={elementValue}
                                    onChangeText={(text) => handleElementChange(id, type, text)}
                                    lang="hi"
                                    placeholder="Enter tags (comma separated)..."
                                    className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1"
                                    containerClassName="flex-1"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={elementValue}
                                    onChange={(e) => handleElementChange(id, type, e.target.value)}
                                    placeholder="Enter tags (comma separated)..."
                                    className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1"
                                />
                            )}
                        </div>
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                            Tags
                        </span>
                    </div>
                );

            case 'image': {
                const imageUrl = elementValue?.split(',')[0]?.trim() || '';
                // Default to 'center' if not set
                const objectPosition = getElementMetadata(id, 'objectPosition') || 'center center';

                // Position options
                const positions = [
                    { label: 'Top Left', value: 'left top' },
                    { label: 'Top Center', value: 'center top' },
                    { label: 'Top Right', value: 'right top' },
                    { label: 'Center Left', value: 'left center' },
                    { label: 'Center', value: 'center center' },
                    { label: 'Center Right', value: 'right center' },
                    { label: 'Bottom Left', value: 'left bottom' },
                    { label: 'Bottom Center', value: 'center bottom' },
                    { label: 'Bottom Right', value: 'right bottom' },
                ];

                return (
                    <div className={`${configStyles} group relative`}>
                        {imageUrl ? (
                            <div className="relative">
                                <img
                                    src={imageUrl}
                                    alt="Featured"
                                    className="w-full rounded-md transition-all duration-300"
                                    style={{
                                        ...inlineStyles,
                                        aspectRatio: config?.aspectRatio || '16/9',
                                        objectFit: config?.objectFit || 'cover',
                                        objectPosition: objectPosition
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/800x450?text=Invalid+Image+URL';
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4 p-4">
                                    <input
                                        type="text"
                                        value={elementValue}
                                        onChange={(e) => handleElementChange(id, type, e.target.value)}
                                        placeholder="Image URL..."
                                        className="w-1/2 bg-white/90 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />

                                    {/* Position Picker */}
                                    <div className="bg-white p-2 rounded shadow-lg">
                                        <p className="text-[10px] text-gray-500 mb-1 font-bold text-center uppercase tracking-wider">Position</p>
                                        <div className="grid grid-cols-3 gap-1">
                                            {positions.map(pos => (
                                                <button
                                                    key={pos.value}
                                                    type="button"
                                                    title={pos.label}
                                                    onClick={() => handleElementMetadataChange(id, 'objectPosition', pos.value)}
                                                    className={`w-6 h-6 rounded flex items-center justify-center transition border ${objectPosition === pos.value
                                                        ? 'bg-primary border-primary text-white'
                                                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${objectPosition === pos.value ? 'bg-white' : 'bg-current'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="bg-gray-100 rounded-md flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition"
                                style={{ aspectRatio: config?.aspectRatio || '16/9' }}
                            >
                                <Image size={48} className="mb-2" />
                                <input
                                    type="text"
                                    value={elementValue}
                                    onChange={(e) => handleElementChange(id, type, e.target.value)}
                                    placeholder="Paste image URL here..."
                                    className="bg-white border border-gray-300 rounded px-3 py-2 text-sm w-3/4 text-center"
                                />
                                <p className="text-xs mt-2">Comma separate for multiple images</p>
                            </div>
                        )}
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition">
                            Featured Image
                        </span>
                    </div>
                );
            }

            case 'video': {
                const videoUrl = elementValue;
                let embedUrl = videoUrl;
                if (embedUrl && embedUrl.includes('youtube.com/watch')) {
                    embedUrl = embedUrl.replace('watch?v=', 'embed/');
                } else if (embedUrl && embedUrl.includes('youtu.be/')) {
                    const videoId = embedUrl.split('youtu.be/')[1];
                    embedUrl = `https://www.youtube.com/embed/${videoId}`;
                }

                return (
                    <div className={`${configStyles} group relative`}>
                        {videoUrl ? (
                            <div className="relative">
                                <iframe
                                    className="w-full rounded-md"
                                    style={{ aspectRatio: config?.aspectRatio || '16/9' }}
                                    src={embedUrl}
                                    title="Video"
                                    allowFullScreen
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <input
                                        type="text"
                                        value={elementValue}
                                        onChange={(e) => handleElementChange(id, type, e.target.value)}
                                        placeholder="Video URL..."
                                        className="w-3/4 bg-white/90 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div
                                className="bg-gray-900 rounded-md flex flex-col items-center justify-center text-gray-400"
                                style={{ aspectRatio: config?.aspectRatio || '16/9' }}
                            >
                                <Video size={48} className="mb-2" />
                                <input
                                    type="text"
                                    value={elementValue}
                                    onChange={(e) => handleElementChange(id, type, e.target.value)}
                                    placeholder="Paste YouTube URL here..."
                                    className="bg-white border border-gray-300 rounded px-3 py-2 text-sm w-3/4 text-center text-gray-800"
                                />
                            </div>
                        )}
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition">
                            Video
                        </span>
                    </div>
                );
            }

            case 'text':
                return (
                    <div className={configStyles}>
                        {config?.customContent || 'Custom text'}
                    </div>
                );

            case 'divider':
                return <hr className={`border-t border-${config?.borderColor || 'gray-200'}`} />;

            case 'spacer':
                return <div className="h-8"></div>;

            case 'shape':
                return (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: config?.fillColor || '#4f46e5',
                            borderRadius: config?.shapeType === 'circle' ? '50%' : config?.borderRadius || 0,
                            border: config?.strokeWidth ? `${config?.strokeWidth}px solid ${config?.strokeColor || '#4f46e5'}` : 'none',
                            ...getInlineStyles(config)
                        }}
                    />
                );

            case 'container':
                return (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: config?.backgroundColor || '#f9fafb',
                            borderRadius: config?.borderRadius || 0,
                            border: config?.borderWidth ? `${config?.borderWidth}px solid ${config?.borderColor || '#e5e7eb'}` : 'none',
                            ...getInlineStyles(config)
                        }}
                    />
                );

            default:
                return <div className="text-gray-400">[{type}]</div>;
        }
    };

    return (
        <Layout>
            <form onSubmit={handleSubmit}>
                {/* Top Bar */}
                <div className="bg-white border-b sticky top-0 z-10 px-6 py-3 flex items-center justify-between mb-6 -mx-6 -mt-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-800">{isEditMode ? 'Edit Article' : 'Create Article'}</h1>

                        {/* Language Selector */}
                        <div className="flex items-center bg-gray-100 rounded-md p-1 border">
                            <button
                                type="button"
                                onClick={() => setLanguage('en')}
                                className={`px-3 py-1 text-sm font-medium rounded ${language === 'en' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguage('HN')}
                                className={`px-3 py-1 text-sm font-medium rounded ${language === 'HN' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Hindi
                            </button>
                        </div>

                        {selectedLayout && (
                            <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                                {selectedLayout.name}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".html,.htm"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={handleImportClick}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                        >
                            <Upload size={16} />
                            Import HTML
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${showSettings ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <Settings size={16} />
                            Settings
                        </button>
                        {/* Autosave Status */}
                        {autosaveStatus && (
                            <span className={`text-xs font-medium px-2 py-1 rounded ${autosaveStatus.includes('Failed') ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {autosaveStatus}
                            </span>
                        )}
                        <Button variant="secondary" onClick={() => navigate('/')}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : (isEditMode ? 'Update Article' : 'Publish Article')}
                        </Button>
                    </div>
                </div>

                {/* Settings Panel (collapsible) */}
                {showSettings && (
                    <div className="bg-gray-50 border rounded-lg p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Layout Selector */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                <Palette size={16} />
                                Layout Template
                            </label>
                            <select
                                value={formData.layoutTemplate}
                                onChange={(e) => handleChange('layoutTemplate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Default Layout</option>
                                {layouts.filter(l => l.layoutType === 'grid').length > 0 && (
                                    <optgroup label="Standard Layouts">
                                        {layouts.filter(l => l.layoutType === 'grid').map(layout => (
                                            <option key={layout._id} value={layout._id}>
                                                {layout.name} {layout.isDefault ? '(Default)' : ''}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                {layouts.filter(l => l.layoutType === 'freeform').length > 0 && (
                                    <optgroup label="Freeform Layouts">
                                        {layouts.filter(l => l.layoutType === 'freeform').map(layout => (
                                            <option key={layout._id} value={layout._id}>
                                                {layout.name} {layout.isDefault ? '(Default)' : ''}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            <Link to="/layouts" className="text-xs text-primary hover:underline mt-1 inline-block">
                                Manage Templates →
                            </Link>
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                <span className="font-mono text-xs border rounded px-1">URL</span>
                                Slug (URL)
                            </label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => handleChange('slug', e.target.value)}
                                placeholder="my-custom-slug"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono text-gray-600"
                            />
                            <p className="text-xs text-gray-400 mt-1">Leave empty to auto-generate from title</p>
                        </div>

                        {/* SEO Metadata */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                <FileText size={16} />
                                SEO Metadata
                            </label>
                            <input
                                type="text"
                                value={formData.metadata}
                                onChange={(e) => handleChange('metadata', e.target.value)}
                                placeholder="Meta description..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                        </div>

                        {/* Keywords */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                <Tag size={16} />
                                Keywords
                            </label>
                            <input
                                type="text"
                                value={formData.keywords}
                                onChange={(e) => handleChange('keywords', e.target.value)}
                                placeholder="SEO keywords (comma separated)..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                        </div>

                        {/* Publish Status */}
                        <div className="md:col-span-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_Published}
                                    onChange={(e) => handleChange('is_Published', e.target.checked)}
                                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                                />
                                <span className="font-medium text-gray-700">Publish Immediately</span>
                                <span className="text-sm text-gray-500">(Otherwise saved as draft)</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Main Editor Area */}
                <div className={`bg-white shadow-lg rounded-lg p-8 max-w-${selectedLayout?.maxWidth || '4xl'} mx-auto`}>
                    {selectedLayout && selectedLayout.layoutType === 'freeform' && selectedLayout.elements?.length > 0 ? (
                        // Freeform Layout - Absolute Positioning
                        <div
                            className="relative bg-gray-50 rounded-lg border border-gray-200 overflow-auto"
                            style={{
                                width: selectedLayout.canvas?.width || 1200,
                                height: selectedLayout.canvas?.height || 1800,
                                maxWidth: '100%',
                                margin: '0 auto'
                            }}
                        >
                            {selectedLayout.elements
                                .sort((a, b) => a.zIndex - b.zIndex)
                                .map(element => (
                                    <div
                                        key={element.id}
                                        style={{
                                            position: 'absolute',
                                            left: element.x,
                                            top: element.y,
                                            width: element.width,
                                            height: element.height,
                                            zIndex: element.zIndex,
                                            opacity: (element.opacity || 100) / 100
                                        }}
                                    >
                                        {renderInlineInput(element)}
                                    </div>
                                ))
                            }
                        </div>
                    ) : selectedLayout && selectedLayout.layoutType === 'grid' && selectedLayout.elements?.length > 0 ? (
                        // Grid Layout Editor - existing logic
                        <div className={`grid grid-cols-12 gap-${selectedLayout?.gridGap || '4'}`}>
                            {(() => {
                                const allElements = [...selectedLayout.elements].sort((a, b) => a.row - b.row);
                                const rootElements = allElements.filter(el => !el.parentId);

                                return rootElements.map((element) => {
                                    if (element.type === 'section') {
                                        const children = allElements.filter(el => el.parentId === element.id);
                                        const columns = element.config.columns || 2;

                                        return (
                                            <div
                                                key={element.id}
                                                style={{ gridColumn: `span ${element.width} / span ${element.width}` }}
                                                className="border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/50"
                                            >
                                                <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
                                                    {Array.from({ length: columns }, (_, i) => i).map(colIndex => {
                                                        const colElements = children
                                                            .filter(child => child.column === colIndex)
                                                            .sort((a, b) => a.row - b.row || a.order - b.order);

                                                        return (
                                                            <div key={colIndex} className="flex flex-col gap-4 min-h-[50px]">
                                                                {colElements.map(child => (
                                                                    <div key={child.id}>
                                                                        {renderInlineInput(child)}
                                                                    </div>
                                                                ))}
                                                                {colElements.length === 0 && (
                                                                    <div className="flex-1 border-2 border-dashed border-gray-100 rounded flex items-center justify-center text-xs text-gray-300 py-4">
                                                                        Col {colIndex + 1} Empty
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={element.id}
                                            style={{ gridColumn: `span ${element.width} / span ${element.width}` }}
                                        >
                                            {renderInlineInput(element)}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    ) : (
                        // Default Inline Layout - inline to prevent focus loss
                        <article className="space-y-6">
                            {/* Tags */}
                            <div className="group relative">
                                <div className="flex flex-wrap gap-2 items-center">
                                    {formData.tags && formData.tags.split(',').map((tag, idx) => (
                                        tag.trim() && (
                                            <span key={idx} className="text-red-600 font-bold uppercase text-xs tracking-wider">
                                                {tag.trim()}
                                            </span>
                                        )
                                    ))}
                                    {!formData.tags && (
                                        <span className="text-gray-400 text-xs">Tags will appear here</span>
                                    )}
                                </div>
                                {isHindi ? (
                                    <ReactTransliterate
                                        value={formData.tags}
                                        onChangeText={(text) => handleChange('tags', text)}
                                        lang="hi"
                                        placeholder="Enter tags (comma separated)..."
                                        className="mt-2 w-full bg-gray-50 border border-dashed border-gray-300 rounded px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        containerClassName="mt-2 w-full"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={formData.tags}
                                        onChange={(e) => handleChange('tags', e.target.value)}
                                        placeholder="Enter tags (comma separated)..."
                                        className="mt-2 w-full bg-gray-50 border border-dashed border-gray-300 rounded px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                )}
                            </div>

                            {/* Headline */}
                            <div className="group relative">
                                {isHindi ? (
                                    <ReactTransliterate
                                        value={formData.article_header}
                                        onChangeText={(text) => handleChange('article_header', text)}
                                        lang="hi"
                                        placeholder="Enter your headline here..."
                                        className="w-full text-3xl md:text-4xl font-serif font-bold text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2"
                                        containerClassName="w-full"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={formData.article_header}
                                        onChange={(e) => handleChange('article_header', e.target.value)}
                                        placeholder="Enter your headline here..."
                                        className="w-full text-3xl md:text-4xl font-serif font-bold text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2"
                                    />
                                )}
                                <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                                    Headline *
                                </span>
                            </div>

                            {/* Summary */}
                            <div className="group relative border-l-4 border-gray-300 pl-4">
                                {isHindi ? (
                                    <ReactTransliterate
                                        value={formData.summary}
                                        onChangeText={(text) => handleChange('summary', text)}
                                        lang="hi"
                                        placeholder="Write a compelling summary..."
                                        className="w-full text-lg text-gray-600 italic placeholder-gray-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-none"
                                        containerClassName="w-full"
                                        renderComponent={(props) => <textarea {...props} rows={3} />}
                                    />
                                ) : (
                                    <textarea
                                        value={formData.summary}
                                        onChange={(e) => handleChange('summary', e.target.value)}
                                        placeholder="Write a compelling summary..."
                                        rows={3}
                                        className="w-full text-lg text-gray-600 italic placeholder-gray-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-none"
                                    />
                                )}
                                <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                                    Summary
                                </span>
                            </div>

                            {/* Author and Date */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-b border-gray-100 py-4 gap-4">
                                <div className="flex items-center gap-3 group relative">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                                        {formData.author?.charAt(0) || 'A'}
                                    </div>
                                    <div>
                                        {isHindi ? (
                                            <ReactTransliterate
                                                value={formData.author}
                                                onChangeText={(text) => handleChange('author', text)}
                                                lang="hi"
                                                placeholder="Author name"
                                                className="font-bold text-sm text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-1"
                                                containerClassName="inline-block"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={formData.author}
                                                onChange={(e) => handleChange('author', e.target.value)}
                                                placeholder="Author name"
                                                className="font-bold text-sm text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-1"
                                            />
                                        )}
                                        <div className="text-xs text-gray-500">{new Date().toLocaleString()}</div>
                                    </div>
                                    <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                                        Author
                                    </span>
                                </div>
                            </div>

                            {/* Featured Image */}
                            <div className="group relative">
                                {formData.photos.split(',')[0]?.trim() ? (
                                    <figure className="relative">
                                        <img
                                            src={formData.photos.split(',')[0].trim()}
                                            alt={formData.article_header_en || 'Featured'}
                                            className="w-full h-auto rounded-md object-cover"
                                            style={{ aspectRatio: '16/9' }}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://placehold.co/800x450?text=Invalid+Image+URL';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-md">
                                            <input
                                                type="text"
                                                value={formData.photos}
                                                onChange={(e) => handleChange('photos', e.target.value)}
                                                placeholder="Image URL..."
                                                className="w-3/4 bg-white rounded px-3 py-2 text-sm"
                                            />
                                        </div>
                                    </figure>
                                ) : (
                                    <div className="bg-gray-100 rounded-md flex flex-col items-center justify-center text-gray-400 py-12">
                                        <Image size={48} className="mb-3" />
                                        <input
                                            type="text"
                                            value={formData.photos}
                                            onChange={(e) => handleChange('photos', e.target.value)}
                                            placeholder="Paste image URL here..."
                                            className="bg-white border border-gray-300 rounded px-4 py-2 text-sm w-2/3 text-center"
                                        />
                                        <p className="text-xs mt-2 text-gray-400">Comma separate for multiple images</p>
                                    </div>
                                )}
                                <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition">
                                    Featured Image
                                </span>
                            </div>

                            {/* Video (optional) */}
                            <div className="group relative">
                                {formData.video ? (
                                    <div className="relative">
                                        <iframe
                                            className="w-full rounded-md"
                                            style={{ aspectRatio: '16/9' }}
                                            src={formData.video.includes('youtube.com/watch')
                                                ? formData.video.replace('watch?v=', 'embed/')
                                                : formData.video.includes('youtu.be/')
                                                    ? `https://www.youtube.com/embed/${formData.video.split('youtu.be/')[1]}`
                                                    : formData.video
                                            }
                                            title="Video"
                                            allowFullScreen
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-md">
                                            <input
                                                type="text"
                                                value={formData.video}
                                                onChange={(e) => handleChange('video', e.target.value)}
                                                placeholder="YouTube URL..."
                                                className="w-3/4 bg-white rounded px-3 py-2 text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400 py-6">
                                        <Video size={24} className="mr-2" />
                                        <input
                                            type="text"
                                            value={formData.video}
                                            onChange={(e) => handleChange('video', e.target.value)}
                                            placeholder="Optional: Paste YouTube URL..."
                                            className="bg-transparent border-none outline-none text-sm placeholder-gray-400"
                                        />
                                    </div>
                                )}
                                <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition">
                                    Video (Optional)
                                </span>
                            </div>

                            {/* Body */}
                            <div className="group relative">
                                {isHindi ? (
                                    <ReactTransliterate
                                        value={formData.body}
                                        onChangeText={(text) => handleChange('body', text)}
                                        lang="hi"
                                        placeholder="Write your article content here...

You can use multiple paragraphs, and the content will be displayed exactly as you write it.

Start typing to see your article come to life!"
                                        className="w-full text-lg text-gray-800 leading-relaxed font-serif placeholder-gray-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-y min-h-[300px]"
                                        containerClassName="w-full"
                                        renderComponent={(props) => <textarea {...props} rows={15} />}
                                    />
                                ) : (
                                    <textarea
                                        value={formData.body}
                                        onChange={(e) => handleChange('body', e.target.value)}
                                        placeholder="Write your article content here...

You can use multiple paragraphs, and the content will be displayed exactly as you write it.

Start typing to see your article come to life!"
                                        rows={15}
                                        className="w-full text-lg text-gray-800 leading-relaxed font-serif placeholder-gray-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-y min-h-[300px]"
                                    />
                                )}
                                <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                                    Article Body
                                </span>
                            </div>
                        </article>
                    )}
                </div>

                {/* Floating Action Bar */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-full px-6 py-3 flex items-center gap-4 border">
                    <span className="text-sm text-gray-500">
                        {(formData.article_header || Object.values(elementData).some(e => e.type === 'header' && e.value)) ? '✓ Headline' : '○ Headline'}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">
                        {(formData.body || Object.values(elementData).some(e => e.type === 'body' && e.value)) ? '✓ Body' : '○ Body'}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">
                        {(formData.photos || Object.values(elementData).some(e => e.type === 'image' && e.value)) ? '✓ Image' : '○ Image'}
                    </span>
                    <span className="text-gray-300">|</span>
                    <Button type="submit" disabled={loading} className="ml-2">
                        {loading ? 'Saving...' : 'Publish'}
                    </Button>
                </div>
            </form>
        </Layout>
    );
};

export default CreateArticle;

