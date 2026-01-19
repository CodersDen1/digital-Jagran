import React, { useEffect, useState } from 'react';
import { articleService } from '../../services/api';
import Layout from '../common/Layout';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Eye } from 'lucide-react';

const Dashboard = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadArticles();
    }, []);

    const loadArticles = async () => {
        try {
            const data = await articleService.getAll();
            setArticles(data);
        } catch (error) {
            console.error("Failed to load articles", error);
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
            await articleService.update(id, {
                is_Published: !currentStatus,
                is_Drafted: currentStatus // If we are publishing (true), drafted becomes false
            });
            loadArticles();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    return (
        <Layout>
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Recent Articles</h1>
                <Link to="/create" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-800 transition">
                    + New Article
                </Link>
            </div>

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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title (EN)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lang</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {articles.map((article) => (
                                <tr key={article._id} className="hover:bg-gray-50 text-black">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{article.article_header_en}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-xs">{article.article_header}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.author}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.is_Published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {article.is_Published ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{article.published_language}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handlePublish(article._id, article.is_Published)}
                                            className={`mx-2 font-bold ${article.is_Published ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                                            title={article.is_Published ? "Unpublish" : "Publish"}
                                        >
                                            {article.is_Published ? 'Unpublish' : 'Publish'}
                                        </button>
                                        <button className="text-blue-600 hover:text-blue-900 mx-2"><Eye size={18} /></button>
                                        <button className="text-indigo-600 hover:text-indigo-900 mx-2"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(article._id)} className="text-red-600 hover:text-red-900 mx-2"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Layout>
    );
};

export default Dashboard;
