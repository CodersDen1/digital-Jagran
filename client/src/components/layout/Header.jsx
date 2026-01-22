import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Menu, Search, Globe, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import MobileMenu from './MobileMenu';

const Header = ({ activeCategory, onCategoryChange }) => {
    const { language, toggleLanguage } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Handle scroll for sticky header effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const date = new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'hi-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const categories = ['All', 'Politics', 'Business', 'Tech', 'Sports', 'Entertainment'];

    return (
        <>
            <header className="border-b-4 border-brand-red bg-white font-serif">
                {/* Top Bar */}
                <div className="bg-gray-100 py-1.5 px-4 lg:px-8 flex justify-between items-center text-xs text-gray-600 font-sans">
                    <span className="hidden sm:block">{date}</span>
                    <span className="sm:hidden text-brand-red font-bold"><span style={{ color: '#567C8D' }}>Digital</span><span style={{ color: '#2F4156' }} >Jagaran </span></span>
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-1 hover:text-brand-red font-bold transition"
                        >
                            <Globe size={14} />
                            <span className="hidden sm:inline">
                                {language === 'en' ? 'हिंदी' : 'English'}
                            </span>
                        </button>
                        {/* <span className="hidden md:inline hover:text-brand-red cursor-pointer transition">Follow Us</span>
                        <span className="hidden md:inline hover:text-brand-red cursor-pointer transition">Login</span> */}
                    </div>
                </div>

                {/* Main Header */}
                <div className="sticky top-0 z-40 bg-white lg:static py-4 md:py-6 px-4 lg:px-8 flex justify-between items-center shadow-sm lg:shadow-none">
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden text-gray-800 p-2 -ml-2 hover:bg-gray-100 rounded-lg transition"
                        aria-label="Open menu"
                    >
                        <Menu size={28} />
                    </button>

                    <Link to="/" title="Digital Jagaran Home" className="text-center flex-1 lg:flex-none">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight uppercase" style={{ color: '#567C8D' }}>
                            Digital <span className="text-brand-red" style={{ color: '#2F4156' }}>Jagaran</span>
                        </h1>
                        <p className="hidden sm:block text-xs uppercase tracking-widest text-gray-500 mt-1 text-right">
                            Information, Information and Information
                        </p>
                    </Link>

                    <div className="flex items-center gap-2">
                        {/* Mobile Search Toggle */}
                        <button
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className="lg:hidden p-2 text-gray-600 hover:text-brand-red transition"
                        >
                            {isSearchOpen ? <X size={24} /> : <Search size={24} />}
                        </button>

                        {/* Desktop Search */}
                        {/* <div className="hidden lg:flex gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search news..."
                                    className="pl-3 pr-10 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition w-48"
                                />
                                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div> */}
                    </div>
                </div>

                {/* Mobile Search Bar (expandable) */}
                {isSearchOpen && (
                    <div className="lg:hidden px-4 pb-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search news..."
                                autoFocus
                                className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition"
                            />
                            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                )}

                {/* Category Navigation - Desktop */}
                <nav
                    className={`border-t border-b border-gray-200 py-3 hidden lg:block transition-all duration-300 ${isScrolled
                        ? 'fixed top-0 left-0 right-0 bg-white z-50 shadow-md'
                        : ''
                        }`}
                >
                    <ul className="flex justify-center gap-8 font-sans text-sm uppercase">
                        {categories.map(category => (
                            <li key={category}>
                                <button
                                    onClick={() => onCategoryChange && onCategoryChange(category)}
                                    className={`transition-colors py-1 block relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-brand-red after:transition-all ${activeCategory === category
                                        ? 'text-brand-red font-black after:w-full'
                                        : 'text-gray-600 font-semibold hover:text-brand-red after:w-0 hover:after:w-full'
                                        }`}
                                >
                                    {category}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </header>

            {/* Mobile Menu */}
            <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                activeCategory={activeCategory}
                onCategoryChange={onCategoryChange}
            />
        </>
    );
};

export default Header;

