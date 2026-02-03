import React, { useRef, useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import ElementRenderers from './ElementRenderers';

/**
 * FreeformArticleRenderer - Renders article content using freeform layout with absolute positioning
 * Matches the CMS freeform editor's visual output exactly
 */
const FreeformArticleRenderer = ({ article, layout }) => {
    const { t } = useLanguage();
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);

    // Canvas dimensions from layout
    const canvasWidth = layout.canvas?.width || 1200;
    const canvasHeight = layout.canvas?.height || 1800;

    // Calculate responsive scale on mount and resize
    useEffect(() => {
        const calculateScale = () => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.offsetWidth;
            // Scale down if container is smaller than canvas
            const newScale = Math.min(1, containerWidth / canvasWidth);
            setScale(newScale);
        };

        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [canvasWidth]);

    // Sort elements by zIndex for correct layering
    const sortedElements = [...(layout.elements || [])].sort((a, b) => a.zIndex - b.zIndex);

    // Generate inline styles from element config
    const getElementStyles = (element) => {
        const config = element.config || {};
        const styles = {
            position: 'absolute',
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
            zIndex: element.zIndex || 1,
            opacity: (element.opacity ?? 100) / 100,
            overflow: 'hidden',
        };

        // Transform (rotation)
        if (element.rotation) {
            styles.transform = `rotate(${element.rotation}deg)`;
        }

        // Visibility
        if (element.visible === false) {
            styles.display = 'none';
        }

        // Background and border from config
        if (config.backgroundColor && config.backgroundColor !== 'transparent') {
            styles.backgroundColor = config.backgroundColor;
        }
        if (config.borderRadius) {
            styles.borderRadius = config.borderRadius;
        }
        if (config.borderWidth) {
            styles.border = `${config.borderWidth}px ${config.borderStyle || 'solid'} ${config.borderColor || '#e5e7eb'}`;
        }

        // Shadow
        // Support legacy custom shadow AND new preset shadow
        if (config.boxShadow && config.boxShadow !== 'none') {
            const shadows = {
                'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)'
            };
            styles.boxShadow = shadows[config.boxShadow] || config.boxShadow;
        } else if (config.shadowEnabled) {
            styles.boxShadow = `${config.shadowX || 0}px ${config.shadowY || 4}px ${config.shadowBlur || 8}px ${config.shadowColor || 'rgba(0,0,0,0.1)'}`;
        }

        // Padding
        if (config.paddingTop) styles.paddingTop = config.paddingTop;
        if (config.paddingBottom) styles.paddingBottom = config.paddingBottom;
        if (config.paddingLeft) styles.paddingLeft = config.paddingLeft;
        if (config.paddingRight) styles.paddingRight = config.paddingRight;

        return styles;
    };

    return (
        <div ref={containerRef} className="w-full overflow-hidden">
            {/* Scaled canvas container */}
            <div
                className="relative mx-auto"
                style={{
                    width: canvasWidth,
                    height: canvasHeight,
                    backgroundColor: layout.canvas?.backgroundColor || '#ffffff',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    // Adjust container height when scaled
                    marginBottom: scale < 1 ? -(canvasHeight * (1 - scale)) : 0,
                }}
            >
                {sortedElements.map((element) => (
                    <div
                        key={element.id}
                        style={getElementStyles(element)}
                    >
                        {/* Render element content using shared ElementRenderers */}
                        <div className="w-full h-full">
                            <ElementRenderers
                                type={element.type}
                                elementId={element.id}
                                config={element.config}
                                article={article}
                                t={t}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FreeformArticleRenderer;
