'use client';

import React, { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import { useSearchParams, useRouter } from 'next/navigation';

interface NewsLayoutProps {
    children: ReactNode;
    // Keeping props optional as we use hooks primarily
    activeCategory?: string;
    onCategoryChange?: (category: string) => void;
}

const NewsLayout = ({ children, activeCategory: propActiveCategory, onCategoryChange: propOnCategoryChange }: NewsLayoutProps) => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const categoryFromUrl = searchParams.get('category') || 'ALL';
    const activeCategory = propActiveCategory || categoryFromUrl;

    const handleCategoryChange = (category: string) => {
        if (propOnCategoryChange) {
            propOnCategoryChange(category);
        }
        if (category === 'ALL') {
            router.push('/');
        } else {
            router.push(`/?category=${category}`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Header activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl pb-20 lg:pb-8">
                {children}
            </main>
            <Footer />
            <BottomNav activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />
        </div>
    );
};

export default NewsLayout;
