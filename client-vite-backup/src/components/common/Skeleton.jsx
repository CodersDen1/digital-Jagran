import React from 'react';

/**
 * Skeleton - Loading placeholder component
 * Usage: <Skeleton variant="text" /> | <Skeleton variant="image" /> | <Skeleton variant="card" />
 */
const Skeleton = ({ variant = 'text', className = '', count = 1 }) => {
    const baseClasses = 'animate-pulse bg-gray-200 rounded';

    const variants = {
        text: 'h-4 w-full',
        title: 'h-6 w-3/4',
        image: 'aspect-video w-full',
        avatar: 'w-10 h-10 rounded-full',
        button: 'h-10 w-24',
        card: '',
        custom: ''
    };

    // Card skeleton
    if (variant === 'card') {
        return (
            <div className={`bg-white rounded-lg overflow-hidden shadow-sm ${className}`}>
                <div className={`${baseClasses} aspect-video`} />
                <div className="p-4 space-y-3">
                    <div className={`${baseClasses} h-4 w-1/4`} />
                    <div className={`${baseClasses} h-6 w-3/4`} />
                    <div className={`${baseClasses} h-4 w-full`} />
                    <div className={`${baseClasses} h-4 w-2/3`} />
                    <div className="flex gap-4 pt-2">
                        <div className={`${baseClasses} h-3 w-20`} />
                        <div className={`${baseClasses} h-3 w-16`} />
                    </div>
                </div>
            </div>
        );
    }

    // Article detail skeleton
    if (variant === 'article') {
        return (
            <div className={`space-y-6 ${className}`}>
                <div className={`${baseClasses} h-4 w-24`} />
                <div className={`${baseClasses} h-10 w-full`} />
                <div className={`${baseClasses} h-10 w-3/4`} />
                <div className={`${baseClasses} h-6 w-full`} />
                <div className="flex items-center gap-4">
                    <div className={`${baseClasses} w-10 h-10 rounded-full`} />
                    <div className="space-y-2">
                        <div className={`${baseClasses} h-4 w-32`} />
                        <div className={`${baseClasses} h-3 w-24`} />
                    </div>
                </div>
                <div className={`${baseClasses} aspect-video`} />
                <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className={`${baseClasses} h-4 w-full`} />
                    ))}
                    <div className={`${baseClasses} h-4 w-3/4`} />
                </div>
            </div>
        );
    }

    // Horizontal card skeleton
    if (variant === 'horizontal') {
        return (
            <div className={`flex gap-4 p-4 bg-white rounded-lg ${className}`}>
                <div className={`${baseClasses} w-32 h-24 flex-shrink-0`} />
                <div className="flex-1 space-y-2">
                    <div className={`${baseClasses} h-3 w-16`} />
                    <div className={`${baseClasses} h-5 w-full`} />
                    <div className={`${baseClasses} h-5 w-3/4`} />
                    <div className={`${baseClasses} h-3 w-24`} />
                </div>
            </div>
        );
    }

    // Multiple skeleton lines
    if (count > 1) {
        return (
            <div className={`space-y-2 ${className}`}>
                {[...Array(count)].map((_, i) => (
                    <div
                        key={i}
                        className={`${baseClasses} ${variants[variant]}`}
                        style={{ width: i === count - 1 ? '75%' : '100%' }}
                    />
                ))}
            </div>
        );
    }

    // Single skeleton
    return (
        <div className={`${baseClasses} ${variants[variant]} ${className}`} />
    );
};

/**
 * SkeletonGrid - Grid of skeleton cards
 */
export const SkeletonGrid = ({ count = 6, columns = 2 }) => {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={`grid ${gridCols[columns] || gridCols[2]} gap-6`}>
            {[...Array(count)].map((_, i) => (
                <Skeleton key={i} variant="card" />
            ))}
        </div>
    );
};

export default Skeleton;
