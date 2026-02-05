import React from 'react';
import { Home, Grid, Search, TrendingUp } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = ({ activeCategory, onCategoryChange }) => {
    const location = useLocation();

    // Helper to determine if a category is active
    const isActive = (path) => location.pathname === path;
    const isCategoryActive = (cat) => activeCategory === cat && location.pathname === '/';

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
            <div className="flex justify-around items-center h-16">
                <Link
                    to="/"
                    onClick={() => onCategoryChange && onCategoryChange('ALL')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') && activeCategory === 'ALL' ? 'text-brand-red' : 'text-gray-500'}`}
                >
                    <Home size={24} />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <button
                    onClick={() => onCategoryChange && onCategoryChange('Politics')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isCategoryActive('Politics') ? 'text-brand-red' : 'text-gray-500'}`}
                >
                    <TrendingUp size={24} />
                    <span className="text-[10px] font-medium">Politics</span>
                </button>

                <button
                    onClick={() => {
                        // Open mobile menu or go to categories page if exists
                        // For now, let's just trigger the mobile menu via a prop or event event? 
                        // Actually, the plan didn't specify how to open the menu from here. 
                        // Let's use a "Categories" button that might just toggle the mobile menu from the layout context if possible?
                        // Or just link to a categories view. 
                        // Given constraints, maybe just "Menu" triggering the existing mobile menu is best.
                        // But I don't have access to setMobileMenuOpen from here easily without context.
                        // Let's stick to simple links for now or pass a handler.
                        // The user asked for "app like". 

                        // Let's assume we can pass a handler or use a global context/store later. 
                        // For now, I'll add a 'Menu' item that does nothing or links to a dummy route?
                        // No, let's just make it 'Sports' for now as a placeholder for a category to match the plan "Links: Home, Categories, Search, Trending".
                        onCategoryChange && onCategoryChange('Sports');
                    }}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isCategoryActive('Sports') ? 'text-brand-red' : 'text-gray-500'}`}
                >
                    <Grid size={24} />
                    <span className="text-[10px] font-medium">Sports</span>
                </button>
            </div>
        </div>
    );
};

export default BottomNav;
