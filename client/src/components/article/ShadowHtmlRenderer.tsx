import React, { useRef, useEffect } from 'react';

interface ShadowHtmlRendererProps {
    htmlContent: string;
    className?: string;
}

const ShadowHtmlRenderer = ({ htmlContent, className = '' }: ShadowHtmlRendererProps) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const shadowRootRef = useRef<ShadowRoot | null>(null);

    useEffect(() => {
        if (!hostRef.current) return;

        // Initialize Shadow DOM if not already done
        if (!shadowRootRef.current) {
            shadowRootRef.current = hostRef.current.attachShadow({ mode: 'open' });
        }

        const shadowRoot = shadowRootRef.current;

        // 1. Clear existing content
        shadowRoot.innerHTML = '';

        // 2. Clone global styles (Tailwind, etc.) from the main document
        // This ensures that utility classes like 'text-4xl' work inside the shadow DOM
        const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
        styleSheets.forEach(style => {
            shadowRoot.appendChild(style.cloneNode(true));
        });

        // 3. Create a wrapper for the content
        const wrapper = document.createElement('div');
        wrapper.className = 'shadow-content-wrapper'; // Optional wrapper class
        wrapper.innerHTML = htmlContent;

        // 4. Append the content
        shadowRoot.appendChild(wrapper);

    }, [htmlContent]);

    return <div ref={hostRef} className={className} />;
};

export default ShadowHtmlRenderer;
