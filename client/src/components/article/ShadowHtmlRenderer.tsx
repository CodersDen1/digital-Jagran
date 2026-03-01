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

        // 2. Parse the HTML first to check if it has its own styles
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;
        const embeddedStyles = temp.querySelectorAll('style, link[rel="stylesheet"]');
        const hasOwnStyles = embeddedStyles.length > 0;

        // 3. Add reset styles — use minimal fallback-only styles when content has its own CSS
        const resetStyle = document.createElement('style');
        if (hasOwnStyles) {
            // Content has its own styles (e.g. injected HTML articles).
            // Only provide a lightweight host reset; do NOT override element styles.
            resetStyle.textContent = `
                :host { display: block; }
                .shadow-content-wrapper {
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }
                .shadow-content-wrapper img {
                    max-width: 100%;
                    height: auto;
                }
            `;
        } else {
            // Content has no styles — apply full default styling
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
        }
        shadowRoot.appendChild(resetStyle);

        // 4. Clone embedded styles into shadow root, fixing :root → :host
        // In Shadow DOM, :root matches the document root not the shadow root,
        // so CSS custom properties defined on :root won't work. Rewrite to :host.
        embeddedStyles.forEach(style => {
            const cloned = style.cloneNode(true) as HTMLElement;
            if (cloned.tagName === 'STYLE' && cloned.textContent) {
                cloned.textContent = cloned.textContent.replace(/:root\b/g, ':host');
            }
            shadowRoot.appendChild(cloned);
        });

        // 5. Create a wrapper for the content (strip duplicate <style>/<meta>/<script> tags
        //    since they've already been handled above)
        const wrapper = document.createElement('div');
        wrapper.className = 'shadow-content-wrapper';
        // Remove style/meta/script from innerHTML to avoid duplicate execution
        const contentTemp = document.createElement('div');
        contentTemp.innerHTML = htmlContent;
        // Collect script contents before removing them
        const scriptContents: string[] = [];
        contentTemp.querySelectorAll('script').forEach(el => {
            if (el.textContent) scriptContents.push(el.textContent);
        });
        contentTemp.querySelectorAll('style, meta, script').forEach(el => el.remove());
        wrapper.innerHTML = contentTemp.innerHTML;

        // 6. Append the content
        shadowRoot.appendChild(wrapper);

        // 7. Re-execute scripts inside shadow DOM context.
        //    Rewrite document.getElementById / document.querySelectorAll to search
        //    within the shadow root so the article's JS can find its own elements.
        scriptContents.forEach(code => {
            try {
                const fn = new Function('document', 'shadowRoot', `
                    var _origDoc = document;
                    var _sr = shadowRoot;
                    // Proxy common DOM lookups to shadow root
                    var document = new Proxy(_origDoc, {
                        get(target, prop) {
                            if (prop === 'getElementById') return function(id) { return _sr.getElementById(id); };
                            if (prop === 'querySelectorAll') return function(sel) { return _sr.querySelectorAll(sel); };
                            if (prop === 'querySelector') return function(sel) { return _sr.querySelector(sel); };
                            var val = target[prop];
                            return typeof val === 'function' ? val.bind(target) : val;
                        }
                    });
                    ${code}
                `);
                fn(document, shadowRoot);
            } catch (e) {
                console.warn('[ShadowHtmlRenderer] Script execution error:', e);
            }
        });

    }, [htmlContent]);

    return <div ref={hostRef} className={className} />;
};

export default ShadowHtmlRenderer;
