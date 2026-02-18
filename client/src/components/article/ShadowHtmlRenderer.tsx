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

        // 2. Add a minimal reset style instead of cloning ALL document stylesheets
        // This avoids cloning megabytes of Tailwind CSS into the shadow DOM
        const resetStyle = document.createElement('style');
        resetStyle.textContent = `
            :host { display: block; }
            .shadow-content-wrapper {
                font-family: ui-sans-serif, system-ui, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            .shadow-content-wrapper img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
            }
            .shadow-content-wrapper h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; line-height: 1.2; }
            .shadow-content-wrapper h2 { font-size: 1.5em; font-weight: 700; margin: 0.83em 0; line-height: 1.3; }
            .shadow-content-wrapper h3 { font-size: 1.2em; font-weight: 600; margin: 1em 0; }
            .shadow-content-wrapper p { margin: 1em 0; }
            .shadow-content-wrapper a { color: #d91f27; text-decoration: underline; }
            .shadow-content-wrapper blockquote {
                border-left: 4px solid #d91f27;
                padding: 1em;
                margin: 1em 0;
                background: #f9fafb;
                border-radius: 0 8px 8px 0;
                font-style: italic;
            }
            .shadow-content-wrapper ul, .shadow-content-wrapper ol { padding-left: 2em; margin: 1em 0; }
            .shadow-content-wrapper li { margin: 0.5em 0; }
            .shadow-content-wrapper table { width: 100%; border-collapse: collapse; }
            .shadow-content-wrapper th, .shadow-content-wrapper td { border: 1px solid #e5e7eb; padding: 0.5em; }
            .shadow-content-wrapper figure { margin: 1em 0; text-align: center; }
            .shadow-content-wrapper figcaption { font-size: 0.875em; color: #6b7280; margin-top: 0.5em; }
        `;
        shadowRoot.appendChild(resetStyle);

        // 3. Only clone styles that are from the injected HTML content itself (inline styles in the content)
        // Parse the HTML to extract any <style> or <link> tags embedded within
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;
        const embeddedStyles = temp.querySelectorAll('style, link[rel="stylesheet"]');
        embeddedStyles.forEach(style => {
            shadowRoot.appendChild(style.cloneNode(true));
        });

        // 4. Create a wrapper for the content
        const wrapper = document.createElement('div');
        wrapper.className = 'shadow-content-wrapper';
        wrapper.innerHTML = htmlContent;

        // 5. Append the content
        shadowRoot.appendChild(wrapper);

    }, [htmlContent]);

    return <div ref={hostRef} className={className} />;
};

export default ShadowHtmlRenderer;
