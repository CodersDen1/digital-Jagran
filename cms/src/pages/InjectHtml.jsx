import React, { useState, useRef } from 'react';
import Layout from '../components/common/Layout';
import { Upload, FileCode, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const InjectHtml = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [htmlContent, setHtmlContent] = useState('');
    const [metadata, setMetadata] = useState({
        article_header: '',
        article_header_en: '',
        slug: '',
        summary: '',
        author: 'Global Security Desk',
        published_language: 'en',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError('');
        setSuccess('');

        // Read and Parse HTML
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            setHtmlContent(content);
            parseMetadata(content);
        };
        reader.onerror = () => setError('Failed to read file');
        reader.readAsText(selectedFile);
    };

    const parseMetadata = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract Title
        const title = doc.querySelector('title')?.innerText.split('|')[0].trim() || '';
        const h1 = doc.querySelector('h1')?.innerText.trim();
        const finalTitle = h1 || title;

        // Extract Description
        const desc = doc.querySelector('meta[name="description"]')?.content || '';

        // Extract Author
        const author = doc.querySelector('meta[name="author"]')?.content || 'Global Security Desk';

        // Generate Slug
        const slug = finalTitle.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        setMetadata(prev => ({
            ...prev,
            article_header: finalTitle,
            article_header_en: finalTitle,
            summary: desc,
            author: author,
            slug: slug
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setMetadata(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                htmlContent,
                ...metadata,
                // Ensure english header is set if missing
                article_header_en: metadata.article_header_en || metadata.article_header
            };

            // Use the API URL from env or default
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

            const response = await axios.post(`${API_URL}/articles/inject`, payload);

            setSuccess('Article injected successfully!');
            setTimeout(() => {
                navigate(`/edit-html/${response.data._id}`);
            }, 1500);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to inject article');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <FileCode className="text-blue-600" />
                    Inject HTML Article
                </h1>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">

                    {/* File Upload Area */}
                    <div
                        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".html,.htm"
                            className="hidden"
                        />

                        {file ? (
                            <div className="flex flex-col items-center text-green-700">
                                <CheckCircle size={48} className="mb-2" />
                                <p className="font-semibold text-lg">{file.name}</p>
                                <p className="text-sm opacity-75">{(file.size / 1024).toFixed(2)} KB</p>
                                <p className="text-xs mt-2 underline">Click to change</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-gray-500">
                                <Upload size={48} className="mb-2" />
                                <p className="font-semibold text-lg">Click to Upload HTML File</p>
                                <p className="text-sm">or drag and drop here</p>
                            </div>
                        )}
                    </div>

                    {/* Metadata Form */}
                    {file && (
                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Article Headline</label>
                                    <input
                                        type="text"
                                        name="article_header"
                                        value={metadata.article_header}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                                    <input
                                        type="text"
                                        name="slug"
                                        value={metadata.slug}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Summary (Meta Description)</label>
                                <textarea
                                    name="summary"
                                    value={metadata.summary}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                                    <input
                                        type="text"
                                        name="author"
                                        value={metadata.author}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                                    <select
                                        name="published_language"
                                        value={metadata.published_language}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="en">English (en)</option>
                                        <option value="hi">Hindi (hi)</option>
                                    </select>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={20} />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                                    <CheckCircle size={20} />
                                    {success}
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Injecting...' : 'Inject Article'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default InjectHtml;
