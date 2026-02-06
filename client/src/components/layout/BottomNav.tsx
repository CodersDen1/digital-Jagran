'use client';

import React from 'react';
import { Home, Grid, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
    activeCategory?: string;
    onCategoryChange?: (category: string) => void;
}

const BottomNav = ({ activeCategory, onCategoryChange }: BottomNavProps) => {
    const pathname = usePathname();

    // Helper to determine if a category is active
    const isActive = (path: string) => pathname === path;
    const isCategoryActive = (cat: string) => activeCategory === cat && pathname === '/';

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
            <div className="flex justify-around items-center h-16">
                <Link
                    href="/"
                    onClick={() => onCategoryChange && onCategoryChange('ALL')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') && (!activeCategory || activeCategory === 'ALL') ? 'text-brand-red' : 'text-gray-500'}`}
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
                        // Using Sports as placeholder like before
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
