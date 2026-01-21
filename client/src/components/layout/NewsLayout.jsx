import React from 'react';
import Header from './Header';
import Footer from './Footer';


const NewsLayout = ({ children, activeCategory, onCategoryChange }) => {
    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Header activeCategory={activeCategory} onCategoryChange={onCategoryChange} />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default NewsLayout;
