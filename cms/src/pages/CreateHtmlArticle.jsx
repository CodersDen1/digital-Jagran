import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { articleService } from '../services/api';

const CreateHtmlArticle = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const initArticle = async () => {
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
                navigate(`/edit-html/${newArticle._id}`, { replace: true });
            } catch (error) {
                console.error("Failed to create visual article", error);
                alert('Failed to initialize editor');
                navigate('/');
            }
        };

        initArticle();
    }, [navigate]);

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-700">Initializing Visual Editor...</h2>
            </div>
        </div>
    );
};

export default CreateHtmlArticle;
