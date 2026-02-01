import React, { useRef, useState, useEffect } from 'react';

const Ticker = ({ articles }) => {
    const scrollRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Auto-scroll effect
    useEffect(() => {
        const container = scrollRef.current;
        if (!container || isPaused) return;

        const scrollSpeed = 0.6; // pixels per frame (60% of original)
        let animationId;

        const animate = () => {
            if (!isPaused && container) {
                container.scrollLeft += scrollSpeed;

                // Reset scroll when reaching the end (loop effect)
                if (container.scrollLeft >= container.scrollWidth - container.clientWidth) {
                    container.scrollLeft = 0;
                }
            }
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationId);
    }, [isPaused]);

    // Mouse drag handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setIsPaused(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Resume auto-scroll after 3 seconds
        setTimeout(() => setIsPaused(false), 3000);
    };

    const handleMouseLeave = () => {
        if (isDragging) {
            setIsDragging(false);
            setTimeout(() => setIsPaused(false), 3000);
        }
    };

    // Touch handlers for mobile
    const handleTouchStart = (e) => {
        setIsPaused(true);
        setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleTouchMove = (e) => {
        const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleTouchEnd = () => {
        setTimeout(() => setIsPaused(false), 3000);
    };

    // Duplicate articles for seamless loop
    const duplicatedArticles = [...articles, ...articles];

    return (
        <div
            className="bg-[#0f172a] text-white py-1.5 px-4 flex items-center overflow-hidden font-hind"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => { if (!isDragging) setIsPaused(false); }}
        >
            <span className="font-bold uppercase text-[10px] sm:text-xs mr-4 px-2 py-0.5 bg-[#f59e0b] text-[#0f172a] rounded-sm shadow-sm shrink-0 tracking-wider">
                Trending
            </span>
            <div
                ref={scrollRef}
                className="flex gap-8 items-center overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
                style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {duplicatedArticles.map((article, idx) => (
                    <a
                        key={`${article._id}-${idx}`}
                        href={`/article/${article._id}`}
                        className="text-xs sm:text-sm font-medium hover:text-[#f59e0b] transition-colors flex items-center gap-2 text-gray-300 whitespace-nowrap"
                        onClick={(e) => isDragging && e.preventDefault()}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] inline-block"></span>
                        {article.article_header || article.article_header_en || "Breaking News"}
                    </a>
                ))}
            </div>
        </div>
    );
};

export default Ticker;
