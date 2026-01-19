import React from 'react';

const Ticker = ({ items }) => {
    return (
        <div className="bg-brand-red text-white py-2 px-4 flex items-center overflow-hidden">
            <span className="font-bold uppercase text-xs mr-4 px-2 py-0.5 bg-white text-brand-red rounded shadow-sm shrink-0">
                Breaking News
            </span>
            <div className="whitespace-nowrap animate-marquee flex gap-8">
                {items.map((item, idx) => (
                    <span key={idx} className="text-sm font-medium">
                        • {item}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default Ticker;
