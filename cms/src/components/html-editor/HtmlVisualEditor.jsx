import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articleService, api } from '../../services/api';
import {
    Save, ArrowLeft, Monitor, Smartphone, Undo, Redo, Settings, X,
} from 'lucide-react';

import ElementsPanel from './ElementsPanel';
import PropertiesPanel from './PropertiesPanel';
import EditorCanvas from './EditorCanvas';

const HtmlVisualEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const iframeRef = useRef(null);

    // State
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    const [selectedElement, setSelectedElement] = useState(null);
    const [viewMode, setViewMode] = useState('desktop'); // desktop, mobile

    const [showSettings, setShowSettings] = useState(false);

    // Fetch Article Data
    useEffect(() => {
        fetchArticle();
    }, [id]);

    const fetchArticle = async () => {
        try {
            const data = await articleService.getById(id);
            setArticle(data);

            // Fetch HTML Content
            if (data.storage_type === 'html') {
                try {
                    const lang = data.published_language || 'en';
                    const htmlRes = await api.get(`/articles/${data._id}/content?lang=${lang}`);
                    setHtmlContent(htmlRes.data);
                } catch (err) {
                    console.error("Failed to fetch HTML content", err);
                }
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching article:', error);
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleSave = async () => {
        if (!iframeRef.current) return;
        setSaving(true);
        try {
            const doc = iframeRef.current.contentDocument;

            // Cleanup before saving
            doc.querySelectorAll('[data-editor-hover]').forEach(el => el.removeAttribute('data-editor-hover'));
            doc.querySelectorAll('[data-editor-selected]').forEach(el => el.removeAttribute('data-editor-selected'));
            doc.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
            doc.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach(el => el.classList.remove('drop-target-top', 'drop-target-bottom'));

            const finalHtml = doc.documentElement.outerHTML;

            const contentKey = (article.published_language === 'en') ? 'htmlContent_en' : 'htmlContent';

            await articleService.update(id, {
                ...article,
                [contentKey]: finalHtml
            });

            alert('Saved successfully!');
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStyle = (property, value) => {
        if (!selectedElement || !selectedElement.domNode) return;
        selectedElement.domNode.style[property] = value;
        // Force update to refresh panel state
        setSelectedElement({
            ...selectedElement,
            styles: window.getComputedStyle(selectedElement.domNode)
        });
    };

    const handleUpdateAttribute = (attr, value) => {
        if (!selectedElement || !selectedElement.domNode) return;
        selectedElement.domNode.setAttribute(attr, value);
        const updated = { ...selectedElement };
        if (attr === 'src') updated.src = value;
        if (attr === 'href') updated.href = value;
        setSelectedElement(updated);
    };

    const handleDelete = () => {
        if (!selectedElement || !selectedElement.domNode) return;
        if (window.confirm('Delete this element?')) {
            selectedElement.domNode.remove();
            setSelectedElement(null);
        }
    };

    const handleAddElement = (elementDef) => {
        if (!iframeRef.current) return;
        const doc = iframeRef.current.contentDocument;

        let newEl;

        // Handle complex HTML structures (e.g. Lists, Tables)
        if (elementDef.html) {
            const tempDiv = doc.createElement('div');
            tempDiv.innerHTML = elementDef.html.trim();
            newEl = tempDiv.firstChild;
        } else {
            // Handle simple tags
            newEl = doc.createElement(elementDef.tag);
            if (elementDef.text) newEl.innerText = elementDef.text;
            if (elementDef.src) newEl.setAttribute('src', elementDef.src);
            if (elementDef.href) newEl.setAttribute('href', elementDef.href);
            if (elementDef.className) newEl.className = elementDef.className;
        }

        // Append logic
        let parent = doc.body;
        if (selectedElement && selectedElement.domNode) {
            // If selecting a container (div/section), append inside
            if (['div', 'section', 'article'].includes(selectedElement.tagName)) {
                parent = selectedElement.domNode;
            } else {
                // Otherwise insert after
                parent = selectedElement.domNode.parentElement;
                if (parent) {
                    parent.insertBefore(newEl, selectedElement.domNode.nextSibling);
                    newEl.scrollIntoView({ behavior: 'smooth' });
                    return; // Done
                }
            }
        }

        parent.appendChild(newEl);
        newEl.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) return <div className="p-10 text-center text-white">Loading Editor...</div>;

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">
            {/* Top Navigation Bar */}
            <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm leading-tight">{article?.article_header || article?.slug}</span>
                        <span className="text-[10px] text-slate-500">Visual Studio</span>
                    </div>
                </div>

                {/* Viewport Toggles */}
                <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                    <button
                        onClick={() => setViewMode('desktop')}
                        className={`p-1.5 rounded ${viewMode === 'desktop' ? 'bg-slate-600 shadow-sm text-white' : 'text-slate-400 hover:text-white'}`}
                        title="Desktop View"
                    >
                        <Monitor size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('mobile')}
                        className={`p-1.5 rounded ${viewMode === 'mobile' ? 'bg-slate-600 shadow-sm text-white' : 'text-slate-400 hover:text-white'}`}
                        title="Mobile View"
                    >
                        <Smartphone size={16} />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Settings"
                    >
                        <Settings size={18} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-1.5 rounded-lg text-sm font-medium transition disabled:grayscale disabled:cursor-not-allowed group"
                    >
                        <Save size={16} className="group-hover:scale-110 transition-transform" />
                        {saving ? 'Saving...' : 'Publish Changes'}
                    </button>
                </div>
            </div>

            {/* Main Layout Area */}
            <div className="flex-1 flex mt-14 overflow-hidden relative">

                {/* Left Sidebar: Elements */}
                <ElementsPanel onAddElement={handleAddElement} />

                {/* Center: Canvas */}
                <EditorCanvas
                    htmlContent={htmlContent}
                    viewMode={viewMode}
                    iframeRef={iframeRef}
                    onSelectElement={setSelectedElement}
                    onHoverElement={(el) => { /* Optional: update status bar */ }}
                />

                {/* Right Sidebar: Properties */}
                <PropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateStyle={handleUpdateStyle}
                    onUpdateAttribute={handleUpdateAttribute}
                    onDelete={handleDelete}
                />

                {/* Settings Modal */}
                {showSettings && (
                    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white text-slate-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Settings size={20} className="text-indigo-600" />
                                    Article Settings
                                </h3>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="p-1 hover:bg-gray-200 rounded-full transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-6">
                                {/* General Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Article Title</label>
                                        <input
                                            type="text"
                                            value={article?.article_header || ''}
                                            onChange={(e) => setArticle({ ...article, article_header: e.target.value })}
                                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Enter article title"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
                                        <input
                                            type="text"
                                            value={article?.slug || ''}
                                            onChange={(e) => setArticle({ ...article, slug: e.target.value })}
                                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="article-slug-url"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Author</label>
                                        <input
                                            type="text"
                                            value={article?.author || ''}
                                            onChange={(e) => setArticle({ ...article, author: e.target.value })}
                                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tags / Categories (Comma separated)</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(article?.tags) ? article.tags.join(', ') : (article?.tags || '')}
                                            onChange={(e) => setArticle({ ...article, tags: e.target.value.split(',').map(Boolean) })}
                                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="World, Politics, Tech"
                                        />
                                    </div>
                                </div>

                                {/* SEO */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Summary / Excerpt</label>
                                        <textarea
                                            rows={3}
                                            value={article?.summary || ''}
                                            onChange={(e) => setArticle({ ...article, summary: e.target.value })}
                                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Brief summary for search results..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">SEO Meta Keywords</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(article?.keywords) ? article.keywords.join(', ') : (article?.keywords || '')}
                                            onChange={(e) => setArticle({ ...article, keywords: e.target.value.split(',').map(k => k.trim()) })}
                                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="news, politics, update"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">SEO Meta Title</label>
                                        <input
                                            type="text"
                                            value={article?.metaTitle || ''}
                                            onChange={(e) => setArticle({ ...article, metaTitle: e.target.value })}
                                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Custom Title for SEO"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">SEO Meta Description</label>
                                        <textarea
                                            rows={2}
                                            value={article?.metaDescription || ''}
                                            onChange={(e) => setArticle({ ...article, metaDescription: e.target.value })}
                                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Custom Description for SEO (defaults to summary if empty)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Featured Image URL</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(article?.photos) ? article.photos[0] : (article?.photos || '')}
                                            onChange={(e) => setArticle({ ...article, photos: [e.target.value] })}
                                            className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="pt-4 border-t flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-slate-700">Publication Status:</label>
                                        <select
                                            value={article?.is_Published ? 'published' : 'draft'}
                                            onChange={(e) => setArticle({ ...article, is_Published: e.target.value === 'published' })}
                                            className="border border-slate-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="published">Published</option>
                                        </select>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${article?.is_Published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {article?.is_Published ? 'Live on Site' : 'Draft Mode'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => { setShowSettings(false); handleSave(); }}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium shadow-sm transition"
                                >
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HtmlVisualEditor;
