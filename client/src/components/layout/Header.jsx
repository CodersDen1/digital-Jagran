import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Menu, Search, Globe, X, User } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MobileMenu from './MobileMenu';
import Ticker from '../common/Ticker';
import { getTrendingArticles } from '../../services/api';

const Header = ({ activeCategory, onCategoryChange }) => {
    const { language, toggleLanguage } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [trendingArticles, setTrendingArticles] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();

    // Check if we're on the home page
    const isHomePage = location.pathname === '/';

    // Fetch trending articles for the ticker
    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const data = await getTrendingArticles(5);
                setTrendingArticles(data);
            } catch (error) {
                console.error("Failed to fetch trending articles for ticker", error);
            }
        };
        fetchTrending();
    }, []);

    // Handle scroll for sticky header effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 200);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const categories = ['ALL', 'World', 'Politics', 'Business', 'Tech', 'Sports', 'Entertainment'];

    // Handle category click - navigate to home with category if not on home page
    const handleCategoryClick = (category) => {
        if (isHomePage) {
            // If on home page, just call the prop function
            onCategoryChange && onCategoryChange(category);
        } else {
            // If on article page, navigate to home with category as state
            navigate('/', { state: { category } });
        }
    };

    return (
        <>
            <header className="font-sans bg-[#1e293b] text-white relative z-40">
                {/* Top Bar - Ticker */}
                <div className="bg-[#0f172a] border-b border-[#334155]">
                    <div className="max-w-[1300px] mx-auto">
                        <div className="flex items-center">
                            {/* Ticker Section */}
                            <div className="flex-1 overflow-hidden">
                                {trendingArticles.length > 0 && <Ticker articles={trendingArticles} />}
                            </div>

                            {/* Utility Section */}
                            <div className="hidden md:flex items-center gap-4 px-4 py-1.5 text-xs border-l border-[#334155] h-full text-gray-300">
                                <button
                                    onClick={toggleLanguage}
                                    className="flex items-center gap-1.5 hover:text-[#f59e0b] transition font-medium"
                                >
                                    <Globe size={14} />
                                    <span>{language === 'en' ? 'Int' : 'HN'}</span>
                                </button>
                                <Link to="/login" className="flex items-center gap-1.5 hover:text-[#f59e0b] transition font-medium">
                                    <User size={14} />
                                    <span>Sign in</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Header - Nav + Logo */}
                <div className="bg-[#1e293b]">
                    <div className="max-w-[1300px] mx-auto px-4 lg:px-6">
                        <div className="flex items-end justify-between">
                            {/* Primary Navigation - Bottom aligned with vertical separators */}
                            <nav className="hidden lg:flex items-end h-full">
                                <ul className="flex items-end">
                                    {categories.map((category, idx) => (
                                        <li key={category} className="flex items-end">
                                            <button
                                                onClick={() => handleCategoryClick(category)}
                                                className={`px-4 pb-3 pt-8 text-[15px] font-bold transition-colors border-b-[3px] ${activeCategory === category || (category === 'ALL' && activeCategory?.toLowerCase() === 'all')
                                                    ? 'text-[#f59e0b] border-[#f59e0b]'
                                                    : 'text-gray-300 hover:text-white border-transparent'
                                                    }`}
                                            >
                                                {category}
                                            </button>
                                            {/* Vertical Separator */}
                                            {idx !== categories.length - 1 && (
                                                <span className="h-6 w-[1px] bg-[#475569] self-end mb-4"></span>
                                            )}
                                        </li>
                                    ))}
                                    {/* Amber Menu Button - Commented out
                                    <li className="flex items-end pb-2 ml-3">
                                        <button
                                            className="w-9 h-9 bg-[#f59e0b] rounded-full flex items-center justify-center hover:bg-[#d97706] transition"
                                            onClick={() => setMobileMenuOpen(true)}
                                        >
                                            <Menu size={20} className="text-[#0f172a]" />
                                        </button>
                                    </li>
                                    */}
                                </ul>
                            </nav>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="lg:hidden text-white p-1.5 rounded-full hover:bg-[#334155] transition self-center py-4"
                            >
                                <Menu size={28} />
                            </button>

                            {/* Logo - Right aligned, bottom aligned */}
                            <Link to="/" className="flex flex-col items-end py-3 lg:py-0 lg:pb-2">
                                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none font-serif whitespace-nowrap">
                                    Digital Jagaran
                                </h1>
                                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-400 mt-1">
                                    Information, Information and Information
                                </p>
                            </Link>

                            {/* Search (Mobile only) */}
                            <button
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className="lg:hidden p-2 text-white hover:bg-[#334155] rounded-full transition self-center"
                            >
                                {isSearchOpen ? <X size={24} /> : <Search size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Search Bar */}
                {isSearchOpen && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-xl border-t border-gray-100 p-4 z-50">
                        <div className="max-w-3xl mx-auto relative">
                            <input
                                type="text"
                                placeholder="Search for news, opinion, sports..."
                                autoFocus
                                className="w-full pl-5 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] transition"
                            />
                            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-[#1e293b] text-white rounded-full hover:bg-[#0f172a] transition">
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Mobile Menu Overlay */}
            <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryClick}
            />
        </>
    );
};

export default Header;
