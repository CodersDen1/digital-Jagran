import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Ticker from '../common/Ticker';

const NewsLayout = ({ children, activeCategory, onCategoryChange }) => {
    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Header activeCategory={activeCategory} onCategoryChange={onCategoryChange} />
            <Ticker items={[
                "Sensex jumps 500 points in early trade",
                "PM Modi inaugurates new highway project",
                "Techno Giant releases new AI model",
                "Cricket: India vs Australia series updates"
            ]} />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default NewsLayout;
