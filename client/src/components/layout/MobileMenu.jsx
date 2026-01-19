import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { X, Home, Globe, Newspaper, Briefcase, Laptop, Trophy, Film, MessageSquare, ChevronRight, Search } from 'lucide-react';

/**
 * MobileMenu - Full-screen mobile navigation menu
 */
const MobileMenu = ({ isOpen, onClose }) => {
    const { language, toggleLanguage } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');

    const menuItems = [
        { label: 'Home', path: '/', icon: Home },
        { label: 'India', path: '/', icon: Newspaper },
        { label: 'World', path: '/', icon: Globe },
        { label: 'Business', path: '/', icon: Briefcase },
        { label: 'Tech', path: '/', icon: Laptop },
        { label: 'Sports', path: '/', icon: Trophy },
        { label: 'Entertainment', path: '/', icon: Film },
        { label: 'Opinion', path: '/', icon: MessageSquare },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Menu Panel */}
            <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-white shadow-2xl transform transition-transform duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <Link to="/" onClick={onClose} className="text-xl font-black text-gray-900">
                        Digital <span className="text-brand-red">Jagaran</span>
                    </Link>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-900 transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search news..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                        />
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                    <ul className="space-y-1">
                        {menuItems.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <li key={index}>
                                    <Link
                                        to={item.path}
                                        onClick={onClose}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={20} className="text-gray-500 group-hover:text-brand-red transition" />
                                            <span className="font-medium text-gray-800 group-hover:text-brand-red transition">
                                                {item.label}
                                            </span>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
                    <button
                        onClick={() => {
                            toggleLanguage();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition"
                    >
                        <Globe size={18} />
                        {language === 'en' ? 'हिंदी में पढ़ें' : 'Read in English'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileMenu;
