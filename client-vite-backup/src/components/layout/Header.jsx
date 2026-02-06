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
            <header className="font-hind bg-[#1e293b] text-white relative z-40 sticky top-0 shadow-md">
                {/* Top Bar - Ticker - Hiding on small mobile to save space if needed, or keeping it small */}
                <div className="bg-[#0f172a] border-b border-[#334155] hidden sm:block">
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
                                                className={`px-4 pb-3 pt-8 text-[15px] font-medium transition-colors border-b-[3px] ${activeCategory === category || (category === 'ALL' && activeCategory?.toLowerCase() === 'all')
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
                                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none font-serif whitespace-nowrap">
                                    Digital Jagran
                                </h1>
                                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-400 mt-1">
                                    Information, Information and Information
                                </p>
                            </Link>
                        </div>
                    </div>
                </div>
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
