import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { X, Globe, Briefcase, Laptop, Trophy, Film, ChevronRight, Search, LayoutGrid, Vote } from 'lucide-react';

/**
 * MobileMenu - Full-screen mobile navigation menu
 */
const MobileMenu = ({ isOpen, onClose, onCategoryChange, activeCategory }) => {
    const { language, toggleLanguage } = useLanguage();


    const menuItems = [
        { label: 'All', icon: LayoutGrid },
        { label: 'Politics', icon: Vote },
        { label: 'Business', icon: Briefcase },
        { label: 'Tech', icon: Laptop },
        { label: 'Sports', icon: Trophy },
        { label: 'Entertainment', icon: Film },
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
            <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-white shadow-2xl transform transition-transform duration-300 font-hind">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <Link to="/" onClick={onClose} title="Digital Jagran Home" className="text-xl font-black text-gray-900">
                        Digital <span className="text-brand-red">Jagaran</span>
                    </Link>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-900 transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search Removed */}

                {/* Navigation Links */}
                <nav className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                    <ul className="space-y-1">
                        {menuItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = activeCategory === item.label;
                            return (
                                <li key={index}>
                                    <button
                                        onClick={() => {
                                            onCategoryChange && onCategoryChange(item.label);
                                            onClose();
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition group ${isActive ? 'bg-red-50' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={20} className={`transition ${isActive ? 'text-brand-red' : 'text-gray-500 group-hover:text-brand-red'}`} />
                                            <span className={`font-medium transition ${isActive ? 'text-brand-red' : 'text-gray-800 group-hover:text-brand-red'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                                    </button>
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
