import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { articleService, layoutService } from '../../services/api';
import Layout from '../common/Layout';
import Input from '../common/Input';
import Button from '../common/Button';
import { Palette } from 'lucide-react';

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

    useEffect(() => {
        loadLayouts();
    }, []);

    const loadLayouts = async () => {
        try {
            const data = await layoutService.getAll();
            setLayouts(data);
            // Set default layout if exists
            const defaultLayout = data.find(l => l.isDefault);
            if (defaultLayout) {
                setFormData(prev => ({ ...prev, layoutTemplate: defaultLayout._id }));
            }
        } catch (error) {
            console.error('Error loading layouts:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Process Arrays
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

    return (
        <Layout>
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Create New Article</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Headline (English)"
                            name="article_header_en"
                            value={formData.article_header_en}
                            onChange={handleChange}
                            required
                            placeholder="Enter article headline..."
                        />
                        <Input
                            label="Author"
                            name="author"
                            value={formData.author}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Metadata (English)"
                            name="metadata_en"
                            value={formData.metadata_en}
                            onChange={handleChange}
                            placeholder="SEO Title / Meta Description"
                        />
                        <Input
                            label="Keywords (English, comma separated)"
                            name="keywords_en"
                            value={formData.keywords_en}
                            onChange={handleChange}
                            placeholder="news, india, finance"
                        />
                    </div>

                    <div>
                        <label className="mb-1 text-sm font-semibold text-gray-700 block">Summary (English)</label>
                        <textarea
                            name="summary_en"
                            value={formData.summary_en}
                            onChange={handleChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Brief summary of the article..."
                        />
                    </div>

                    <div>
                        <label className="mb-1 text-sm font-semibold text-gray-700 block">Body (English)</label>
                        <textarea
                            name="body_en"
                            value={formData.body_en}
                            onChange={handleChange}
                            rows="10"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                            placeholder="Write article content here (HTML or Markdown supported)..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <Input
                            label="Photos (URLs, comma separated)"
                            name="photos"
                            value={formData.photos}
                            onChange={handleChange}
                            placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <Input
                            label="Video URL"
                            name="video"
                            value={formData.video}
                            onChange={handleChange}
                            placeholder="https://youtube.com/..."
                        />
                    </div>
                    <Input
                        label="Tags (English, comma separated)"
                        name="tags_en"
                        value={formData.tags_en}
                        onChange={handleChange}
                        placeholder="Politics, Economy, Sports"
                    />

                    {/* Layout Template Selector */}
                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Palette size={16} />
                                Page Layout Template
                            </label>
                            <Link
                                to="/layouts"
                                className="text-xs text-primary hover:underline"
                            >
                                Manage Templates
                            </Link>
                        </div>
                        <select
                            name="layoutTemplate"
                            value={formData.layoutTemplate}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Use Default Layout</option>
                            {layouts.map(layout => (
                                <option key={layout._id} value={layout._id}>
                                    {layout.name} {layout.isDefault ? '(Default)' : ''}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Select a layout to customize how this article is displayed
                        </p>
                    </div>

                    <div className="flex items-center gap-4 border-t pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="is_Published"
                                checked={formData.is_Published}
                                onChange={handleChange}
                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                            />
                            <span className="font-medium text-gray-700">Publish Immediately</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button variant="secondary" onClick={() => navigate('/')}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Create Article'}
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default CreateArticle;

