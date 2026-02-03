import React from 'react';
import ReactDOMServer from 'react-dom/server';

/**
 * HTML Generator for Freeform Articles
 * Converts the layout and article content into a static HTML string.
 */

// Helper to generate Tailwind classes (Simplified version of ElementRenderers logic)
const getConfigClasses = (config, defaultSize = 'base') => {
    if (!config) return '';
    const classes = [];

    // Map of sizes
    const FONT_SIZES = {
        'xs': 'text-xs', 'sm': 'text-sm', 'base': 'text-base', 'lg': 'text-lg',
        'xl': 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl', '4xl': 'text-4xl', '5xl': 'text-5xl'
    };
    const FONT_WEIGHTS = {
        'light': 'font-light', 'normal': 'font-normal', 'medium': 'font-medium',
        'semibold': 'font-semibold', 'bold': 'font-bold'
    };
    const TEXT_ALIGNS = {
        'left': 'text-left', 'center': 'text-center', 'right': 'text-right', 'justify': 'text-justify'
    };
    const FONT_FAMILIES = {
        'serif': 'font-serif', 'sans': 'font-sans'
    };

    // Typography
    if (config.fontSize && FONT_SIZES[config.fontSize]) {
        classes.push(FONT_SIZES[config.fontSize]);
    } else {
        classes.push(FONT_SIZES[defaultSize] || `text-${defaultSize}`);
    }

    if (config.fontWeight && FONT_WEIGHTS[config.fontWeight]) classes.push(FONT_WEIGHTS[config.fontWeight]);
    if (config.fontFamily && FONT_FAMILIES[config.fontFamily]) classes.push(FONT_FAMILIES[config.fontFamily]);
    if (config.textAlign && TEXT_ALIGNS[config.textAlign]) classes.push(TEXT_ALIGNS[config.textAlign]);

    // Text Color
    const TEXT_COLORS = {
        'gray-900': 'text-gray-900', 'gray-700': 'text-gray-700', 'gray-600': 'text-gray-600',
        'gray-500': 'text-gray-500', 'brand-red': 'text-brand-red', 'white': 'text-white',
        'red-500': 'text-red-500', 'blue-500': 'text-blue-500'
    };
    if (config.textColor) {
        if (TEXT_COLORS[config.textColor]) classes.push(TEXT_COLORS[config.textColor]);
        else classes.push(config.textColor.startsWith('text-') ? config.textColor : `text-${config.textColor}`);
    }

    return classes.join(' ');
};

const getInlineStyles = (config) => {
    if (!config) return {};
    const styles = {};
    if (config.textColor) styles.color = config.textColor;
    if (config.boxShadow && config.boxShadow !== 'none') {
        // Simple map or pass through
        styles.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)'; // Default approx
    }
    // Add other inline styles as needed
    return styles;
};

// --- Simplified Renderers ---

const HeaderRenderer = ({ content, config }) => {
    const className = getConfigClasses(config, '4xl');
    const style = getInlineStyles(config);
    const Tag = config?.tag || 'h1';
    return <Tag className={`leading-tight ${className}`} style={style}>{content}</Tag>;
};

const TextRenderer = ({ content, config }) => {
    const className = getConfigClasses(config, 'lg');
    const style = getInlineStyles(config);
    return <div className={`whitespace-pre-wrap ${className}`} style={style}>{content}</div>;
};

const ImageRenderer = ({ content, config }) => {
    const style = {
        objectFit: config?.objectFit || 'cover',
        width: '100%',
        height: '100%',
        borderRadius: config?.borderRadius ? `${config.borderRadius}px` : undefined,
        ...getInlineStyles(config)
    };
    return <img src={content} className="w-full h-full" style={style} alt="" />;
};

const DefaultRenderer = () => <div></div>;

const ElementRenderer = ({ element, content }) => {
    const { type, config } = element;

    switch (type) {
        case 'header': return <HeaderRenderer content={content} config={config} />;
        case 'summary':
        case 'body':
        case 'text': return <TextRenderer content={content} config={config} />;
        case 'image': return <ImageRenderer content={content} config={config} />;
        default: return <DefaultRenderer />;
    }
};


// Main Generator Functional Component
const ArticleHtmlTemplate = ({ layout, articleData, language }) => {
    const canvasWidth = layout.canvas?.width || 1184;
    const canvasHeight = layout.canvas?.height || 1800;
    const sortedElements = [...(layout.elements || [])].sort((a, b) => a.zIndex - b.zIndex);

    const getElementStyle = (element) => {
        const config = element.config || {};
        return {
            position: 'absolute',
            left: `${element.x}px`, // Use px explicitly
            top: `${element.y}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            zIndex: element.zIndex || 1,
            opacity: (element.opacity ?? 100) / 100,
            overflow: 'hidden',
            backgroundColor: config.backgroundColor,
            borderRadius: config.borderRadius ? `${config.borderRadius}px` : undefined,
            borderWidth: config.borderWidth ? `${config.borderWidth}px` : undefined,
            borderStyle: config.borderStyle || 'solid',
            borderColor: config.borderColor,
        };
    };

    return (
        <div style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            backgroundColor: layout.canvas?.backgroundColor || '#ffffff',
            position: 'relative',
            margin: '0 auto',
            overflow: 'hidden'
        }}>
            {sortedElements.map(element => {
                // Determine content based on element ID and articleData
                let content = '';
                if (articleData && articleData[element.id]) {
                    content = articleData[element.id];
                    if (content && content.value) content = content.value; // Handle object format
                }

                return (
                    <div key={element.id} style={getElementStyle(element)}>
                        <ElementRenderer element={element} content={content} />
                    </div>
                );
            })}
        </div>
    );
};

export const generateHtml = (layout, articleData, language) => {
    const htmlString = ReactDOMServer.renderToStaticMarkup(
        <ArticleHtmlTemplate layout={layout} articleData={articleData} language={language} />
    );
    return htmlString;
};
