import React, { useEffect, useState } from 'react';
import { articleService, freeformLayoutService } from '../../services/api';
import Layout from '../common/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye, TrendingUp, Copy } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticles, setSelectedArticles] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [freeformLayoutIds, setFreeformLayoutIds] = useState(new Set());
    const itemsPerPage = 10;

    useEffect(() => {
        loadArticles();
    }, []);

    const handleCreateHtmlArticle = async () => {
        try {
            const uniqueSlug = `visual-article-${Date.now()}`;
            const newArticle = await articleService.create({
                article_header: 'New Visual Article',
                slug: uniqueSlug,
                is_Drafted: true,
                is_Published: false,
                storage_type: 'html',
                author: 'Admin',
                published_language: 'en',
                htmlContent_en: '<div class="container mx-auto p-4"><section class="py-12"><h1 class="text-4xl font-bold mb-4">New Article</h1><p class="text-lg text-gray-600">Start editing this content...</p></section></div>'
            });
            navigate(`/edit-html/${newArticle._id}`);
        } catch (error) {
            console.error("Failed to create HTML article", error);
            alert('Failed to start visual editor');
        }
    };

    const loadArticles = async () => {
        try {
            const [articlesData, freeformLayouts] = await Promise.all([
                articleService.getAll(),
                freeformLayoutService.getAll().catch(() => [])
            ]);

            setArticles(articlesData);

            if (freeformLayouts && Array.isArray(freeformLayouts)) {
                setFreeformLayoutIds(new Set(freeformLayouts.map(l => l._id)));
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this article?')) {
            await articleService.delete(id);
            loadArticles();
        }
    };

    const handlePublish = async (id, currentStatus) => {
        try {
            // Fetch full article first to avoid overwriting with partial data if backend uses PUT replacement
            const article = await articleService.getById(id);

            await articleService.update(id, {
                ...article,
                is_Published: !currentStatus,
                is_Drafted: currentStatus // If we are publishing (true), drafted becomes false. If unpublishing (false), drafted becomes true.
            });
            loadArticles();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleDuplicate = async (id) => {
        if (window.confirm('Are you sure you want to duplicate this article?')) {
            try {
                await articleService.duplicate(id);
                loadArticles();
            } catch (error) {
                console.error("Failed to duplicate article", error);
                alert('Failed to duplicate article');
            }
        }
    };

    const handleTranslate = async (id) => {
        if (window.confirm('Create a translated copy of this article?')) {
            try {
                await articleService.translate(id);
                // Refresh list on success
                alert('Translation started! A new draft article has been created.');
                loadArticles();
            } catch (error) {
                console.error("Translation error", error);
                alert('Error triggering translation');
            }
        }
    };

    const handleCheckboxChange = (id) => {
        setSelectedArticles(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const currentIds = currentArticles.map(a => a._id);
            setSelectedArticles(prev => {
                const newSelection = new Set([...prev, ...currentIds]);
                // Ensure unique IDs
                return Array.from(newSelection);
            });
        } else {
            const currentIds = currentArticles.map(a => a._id);
            setSelectedArticles(prev => prev.filter(id => !currentIds.includes(id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedArticles.length === 0) return;

        if (window.confirm(`Are you sure you want to delete ${selectedArticles.length} articles?`)) {
            try {
                await articleService.deleteBulk(selectedArticles);
                setSelectedArticles([]);
                loadArticles();
            } catch (error) {
                console.error("Failed to delete articles", error);
                alert('Failed to delete selected articles');
            }
        }
    };

    // Calculate total views
    const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
    const publishedCount = articles.filter(a => a.is_Published).length;

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentArticles = articles.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(articles.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);
    const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

    return (
        <Layout>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Articles</p>
                            <p className="text-3xl font-bold text-gray-800">{articles.length}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <Edit size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Published</p>
                            <p className="text-3xl font-bold text-green-600">{publishedCount}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <Eye size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Views</p>
                            <p className="text-3xl font-bold text-brand-red">{totalViews.toLocaleString()}</p>
                        </div>
                        <div className="bg-red-100 p-3 rounded-full">
                            <TrendingUp size={24} className="text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Recent Articles</h1>
                <div className="flex gap-2">
                    <button onClick={handleCreateHtmlArticle} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition flex items-center gap-2">
                        + Visual Editor
                    </button>
                    <Link to="/create" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-800 transition">
                        + New Standard
                    </Link>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedArticles.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 flex justify-between items-center border border-blue-200">
                    <span className="text-blue-800 font-medium">{selectedArticles.length} articles selected</span>
                    <button
                        onClick={handleBulkDelete}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2"
                    >
                        <Trash2 size={18} />
                        Delete Selected
                    </button>
                </div>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : articles.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                    No articles found. Create one!
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={currentArticles.length > 0 && currentArticles.every(a => selectedArticles.includes(a._id))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lang</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentArticles.map((article) => (
                                <tr key={article._id} className="hover:bg-gray-50 text-black">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedArticles.includes(article._id)}
                                            onChange={() => handleCheckboxChange(article._id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                            {/* Show header consistent with published language preference */}
                                            {article.published_language === 'HN' || article.published_language === 'hi'
                                                ? (article.article_header || article.article_header_en)
                                                : (article.article_header_en || article.article_header)
                                            }
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.author}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1 text-sm text-gray-700">
                                            <Eye size={14} className="text-gray-400" />
                                            <span className="font-medium">{(article.views || 0).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.is_Published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {article.is_Published ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${article.published_language === 'en' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {article.published_language || 'EN'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {/* Translate Button */}
                                        <button
                                            onClick={() => handleTranslate(article._id)}
                                            className="text-purple-600 hover:text-purple-900 mx-2 inline-block"
                                            title="Translate"
                                        >
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs uppercase font-bold border border-purple-200 rounded px-1">
                                                    {article.published_language === 'en' ? 'EN→HN' : 'HN→EN'}
                                                </span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handlePublish(article._id, article.is_Published)}
                                            className={`mx-2 font-bold ${article.is_Published ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                                            title={article.is_Published ? "Unpublish" : "Publish"}
                                        >
                                            {article.is_Published ? 'Unpublish' : 'Publish'}
                                        </button>
                                        <a
                                            href={`http://localhost:5173/article/${article._id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-900 mx-2 inline-block"
                                            title="View Article"
                                        >
                                            <Eye size={18} />
                                        </a>
                                        <Link
                                            to={article.storage_type === 'html' || article.layoutTemplate ? `/edit-html/${article._id}` : `/edit/${article._id}`}
                                            className="text-indigo-600 hover:text-indigo-900 mx-2 inline-block"
                                            title="Edit Article"
                                        >
                                            <Edit size={18} />
                                        </Link>
                                        <button onClick={() => handleDuplicate(article._id)} className="text-blue-600 hover:text-blue-900 mx-2" title="Duplicate Article"><Copy size={18} /></button>
                                        <button onClick={() => handleDelete(article._id)} className="text-red-600 hover:text-red-900 mx-2"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && articles.length > itemsPerPage && (
                <div className="flex justify-center items-center mt-6 gap-2">
                    <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => paginate(i + 1)}
                            className={`px-3 py-1 rounded border ${currentPage === i + 1 ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Next
                    </button>
                </div>
            )}
        </Layout>
    );
};

export default Dashboard;
