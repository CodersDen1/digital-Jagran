import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { articleService, layoutService } from '../../services/api';
import Layout from '../common/Layout';
import Button from '../common/Button';
import { Palette, Settings, Image, Video, Tag, FileText } from 'lucide-react';

/**
 * InlineArticleEditor - WYSIWYG-style article editor where inputs are directly in the layout
 */
const CreateArticle = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        article_header_en: '',
        metadata_en: '',
        keywords_en: '',
        summary_en: '',
        body_en: '',
        tags_en: '',
        photos: '',
        video: '',
        is_Published: false,
        author: 'Nisha Mishra',
        layoutTemplate: ''
    });
    const [loading, setLoading] = useState(false);
    const [layouts, setLayouts] = useState([]);
    const [showSettings, setShowSettings] = useState(false);

    // Get the currently selected layout object
    const selectedLayout = layouts.find(l => l._id === formData.layoutTemplate) || null;

    useEffect(() => {
        loadLayouts();
    }, []);

    const loadLayouts = async () => {
        try {
            const data = await layoutService.getAll();
            setLayouts(data);
            const defaultLayout = data.find(l => l.isDefault);
            if (defaultLayout) {
                setFormData(prev => ({ ...prev, layoutTemplate: defaultLayout._id }));
            }
        } catch (error) {
            console.error('Error loading layouts:', error);
        }
    };

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            keywords_en: formData.keywords_en.split(',').map(s => s.trim()),
            tags_en: formData.tags_en.split(',').map(s => s.trim()),
            photos: formData.photos.split(',').map(s => s.trim()).filter(Boolean),
            is_Drafted: !formData.is_Published,
            layoutTemplate: formData.layoutTemplate || undefined
        };

        try {
            await articleService.create(payload);
            alert('Article Created Successfully! Translations are being processed in background.');
            navigate('/');
        } catch (error) {
            console.error(error);
            alert('Failed to create article');
        } finally {
            setLoading(false);
        }
    };

    // Generate CSS classes from config
    const getConfigStyles = (config) => {
        if (!config) return '';
        const classes = [];

        if (config.fontSize) classes.push(`text-${config.fontSize}`);
        if (config.fontWeight) classes.push(`font-${config.fontWeight}`);
        if (config.fontFamily) classes.push(`font-${config.fontFamily}`);
        if (config.textAlign) classes.push(`text-${config.textAlign}`);
        if (config.textColor) classes.push(`text-${config.textColor}`);
        if (config.lineHeight && config.lineHeight !== 'normal') {
            classes.push(`leading-${config.lineHeight}`);
        }
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

    // Render inline input for each element type
    const renderInlineInput = (element) => {
        const { type, config } = element;
        const configStyles = getConfigStyles(config);

        switch (type) {
            case 'header':
                return (
                    <div className={`${configStyles} group relative`}>
                        <input
                            type="text"
                            value={formData.article_header_en}
                            onChange={(e) => handleChange('article_header_en', e.target.value)}
                            placeholder="Click to enter headline..."
                            className="w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2"
                            style={{ fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit' }}
                        />
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                            Headline
                        </span>
                    </div>
                );

            case 'summary':
                return (
                    <div className={`${configStyles} group relative`}>
                        <textarea
                            value={formData.summary_en}
                            onChange={(e) => handleChange('summary_en', e.target.value)}
                            placeholder="Click to enter summary..."
                            rows={3}
                            className="w-full bg-transparent border-none outline-none text-gray-600 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-none"
                            style={{ fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit' }}
                        />
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                            Summary
                        </span>
                    </div>
                );

            case 'body':
                return (
                    <div className={`${configStyles} group relative`}>
                        <textarea
                            value={formData.body_en}
                            onChange={(e) => handleChange('body_en', e.target.value)}
                            placeholder="Click to write article body content..."
                            rows={10}
                            className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-y min-h-[200px]"
                            style={{ fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit' }}
                        />
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                            Body Content
                        </span>
                    </div>
                );

            case 'author':
                return (
                    <div className={`${configStyles} flex items-center gap-3 group relative`}>
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                            {formData.author?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={formData.author}
                                onChange={(e) => handleChange('author', e.target.value)}
                                placeholder="Author name..."
                                className="w-full bg-transparent border-none outline-none font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-1"
                            />
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
                            {formData.tags_en ? (
                                formData.tags_en.split(',').map((tag, idx) => (
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
                            <input
                                type="text"
                                value={formData.tags_en}
                                onChange={(e) => handleChange('tags_en', e.target.value)}
                                placeholder="Enter tags (comma separated)..."
                                className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm placeholder-gray-400 focus:ring-2 focus:ring-primary/20 rounded px-2 py-1"
                            />
                        </div>
                        <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                            Tags
                        </span>
                    </div>
                );

            case 'image': {
                const imageUrl = formData.photos.split(',')[0]?.trim();
                return (
                    <div className={`${configStyles} group relative`}>
                        {imageUrl ? (
                            <div className="relative">
                                <img
                                    src={imageUrl}
                                    alt="Featured"
                                    className="w-full rounded-md"
                                    style={{
                                        aspectRatio: config?.aspectRatio || '16/9',
                                        objectFit: config?.objectFit || 'cover'
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/800x450?text=Invalid+Image+URL';
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <input
                                        type="text"
                                        value={formData.photos}
                                        onChange={(e) => handleChange('photos', e.target.value)}
                                        placeholder="Image URL..."
                                        className="w-3/4 bg-white/90 rounded px-3 py-2 text-sm"
                                    />
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
                                    value={formData.photos}
                                    onChange={(e) => handleChange('photos', e.target.value)}
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
                const videoUrl = formData.video;
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
                                        value={formData.video}
                                        onChange={(e) => handleChange('video', e.target.value)}
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
                                    value={formData.video}
                                    onChange={(e) => handleChange('video', e.target.value)}
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

            default:
                return <div className="text-gray-400">[{type}]</div>;
        }
    };

    // Default layout when no custom layout is selected
    const DefaultInlineLayout = () => (
        <article className="space-y-6">
            {/* Tags */}
            <div className="group relative">
                <div className="flex flex-wrap gap-2 items-center">
                    {formData.tags_en && formData.tags_en.split(',').map((tag, idx) => (
                        tag.trim() && (
                            <span key={idx} className="text-red-600 font-bold uppercase text-xs tracking-wider">
                                {tag.trim()}
                            </span>
                        )
                    ))}
                    {!formData.tags_en && (
                        <span className="text-gray-400 text-xs">Tags will appear here</span>
                    )}
                </div>
                <input
                    type="text"
                    value={formData.tags_en}
                    onChange={(e) => handleChange('tags_en', e.target.value)}
                    placeholder="Enter tags (comma separated)..."
                    className="mt-2 w-full bg-gray-50 border border-dashed border-gray-300 rounded px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
            </div>

            {/* Headline */}
            <div className="group relative">
                <input
                    type="text"
                    value={formData.article_header_en}
                    onChange={(e) => handleChange('article_header_en', e.target.value)}
                    placeholder="Enter your headline here..."
                    className="w-full text-3xl md:text-4xl font-serif font-bold text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2"
                />
                <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                    Headline *
                </span>
            </div>

            {/* Summary */}
            <div className="group relative border-l-4 border-gray-300 pl-4">
                <textarea
                    value={formData.summary_en}
                    onChange={(e) => handleChange('summary_en', e.target.value)}
                    placeholder="Write a compelling summary..."
                    rows={3}
                    className="w-full text-lg text-gray-600 italic placeholder-gray-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-none"
                />
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
                        <input
                            type="text"
                            value={formData.author}
                            onChange={(e) => handleChange('author', e.target.value)}
                            placeholder="Author name"
                            className="font-bold text-sm text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-1"
                        />
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
                <textarea
                    value={formData.body_en}
                    onChange={(e) => handleChange('body_en', e.target.value)}
                    placeholder="Write your article content here...

You can use multiple paragraphs, and the content will be displayed exactly as you write it.

Start typing to see your article come to life!"
                    rows={15}
                    className="w-full text-lg text-gray-800 leading-relaxed font-serif placeholder-gray-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-2 py-1 -mx-2 resize-y min-h-[300px]"
                />
                <span className="absolute -top-5 left-0 text-xs bg-primary text-white px-2 py-0.5 rounded opacity-0 group-focus-within:opacity-100 transition">
                    Article Body
                </span>
            </div>
        </article>
    );

    // Layout with custom template
    const CustomLayoutEditor = () => {
        const elements = selectedLayout?.elements || [];
        const sortedElements = [...elements].sort((a, b) => a.row - b.row);

        return (
            <div className={`grid grid-cols-12 gap-${selectedLayout?.gridGap || '4'}`}>
                {sortedElements.map((element) => (
                    <div
                        key={element.id}
                        style={{ gridColumn: `span ${element.width} / span ${element.width}` }}
                    >
                        {renderInlineInput(element)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Layout>
            <form onSubmit={handleSubmit}>
                {/* Top Bar */}
                <div className="bg-white border-b sticky top-0 z-10 px-6 py-3 flex items-center justify-between mb-6 -mx-6 -mt-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-800">Create Article</h1>
                        {selectedLayout && (
                            <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                                {selectedLayout.name}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${showSettings ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <Settings size={16} />
                            Settings
                        </button>
                        <Button variant="secondary" onClick={() => navigate('/')}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Publish Article'}
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
                                {layouts.map(layout => (
                                    <option key={layout._id} value={layout._id}>
                                        {layout.name} {layout.isDefault ? '(Default)' : ''}
                                    </option>
                                ))}
                            </select>
                            <Link to="/layouts" className="text-xs text-primary hover:underline mt-1 inline-block">
                                Manage Templates →
                            </Link>
                        </div>

                        {/* SEO Metadata */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                <FileText size={16} />
                                SEO Metadata
                            </label>
                            <input
                                type="text"
                                value={formData.metadata_en}
                                onChange={(e) => handleChange('metadata_en', e.target.value)}
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
                                value={formData.keywords_en}
                                onChange={(e) => handleChange('keywords_en', e.target.value)}
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
                    {selectedLayout && selectedLayout.elements?.length > 0 ? (
                        <CustomLayoutEditor />
                    ) : (
                        <DefaultInlineLayout />
                    )}
                </div>

                {/* Floating Action Bar */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-full px-6 py-3 flex items-center gap-4 border">
                    <span className="text-sm text-gray-500">
                        {formData.article_header_en ? '✓ Headline' : '○ Headline'}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">
                        {formData.body_en ? '✓ Body' : '○ Body'}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">
                        {formData.photos ? '✓ Image' : '○ Image'}
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

