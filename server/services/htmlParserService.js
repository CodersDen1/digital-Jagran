const cheerio = require('cheerio');

class HtmlParserService {
    /**
     * Parses HTML content and converts it into Freeform Elements
     * @param {string} htmlContent - Raw HTML string
     * @returns {Array} - Array of Freeform Element objects
     */
    parse(htmlContent) {
        const $ = cheerio.load(htmlContent);
        const elements = [];
        let currentY = 0; // Track vertical position
        const CANVAS_WIDTH = 1184;
        const PADDING = 40;
        const CONTENT_WIDTH = CANVAS_WIDTH - (PADDING * 2);

        // Iterate over direct children of body or the provided content
        const root = $('body').length ? $('body') : $.root();

        root.children().each((index, element) => {
            const el = $(element);
            const tagName = element.tagName.toLowerCase();
            const id = `el-${Date.now()}-${index}`;

            // Extract common styles
            const styles = this.extractStyles(el);

            // Default element structure
            let newElement = {
                id,
                x: PADDING,
                y: currentY,
                width: CONTENT_WIDTH,
                height: 100, // Default, will estimate
                zIndex: index + 1,
                visible: true,
                locked: false,
                opacity: 100,
                config: {
                    ...styles,
                    paddingTop: 10,
                    paddingBottom: 10
                }
            };

            // Map tags to element types
            switch (tagName) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    newElement.type = 'header';
                    newElement.height = 60;
                    newElement.config.customContent = el.text().trim();
                    // Set font size based on tag if not explicit in style
                    if (!newElement.config.fontSize) {
                        const sizes = { h1: '4xl', h2: '3xl', h3: '2xl', h4: 'xl', h5: 'lg', h6: 'base' };
                        newElement.config.fontSize = sizes[tagName];
                    }
                    newElement.config.fontWeight = newElement.config.fontWeight || 'bold';
                    break;

                case 'p':
                    newElement.type = 'body';
                    newElement.height = Math.max(80, Math.ceil(el.text().length / 100) * 25); // Estimate height
                    newElement.config.customContent = el.text().trim();
                    break;

                case 'img':
                    newElement.type = 'image';
                    newElement.height = 400; // Default height for images
                    newElement.config.imageUrl = el.attr('src');
                    // Try to get dimensions from attributes
                    if (el.attr('height')) newElement.height = parseInt(el.attr('height'));
                    if (el.attr('width')) {
                        // Limit width to content width
                        const w = parseInt(el.attr('width'));
                        newElement.width = Math.min(w, CONTENT_WIDTH);
                    }
                    newElement.config.objectFit = 'contain';
                    break;

                case 'ul':
                case 'ol':
                    newElement.type = 'text'; // Use rich text for lists
                    newElement.height = Math.max(100, el.children().length * 30);
                    newElement.config.customContent = $.html(element); // Keep inner HTML
                    break;

                case 'iframe':
                    if (el.attr('src') && el.attr('src').includes('youtube')) {
                        newElement.type = 'video';
                        newElement.height = 400;
                        newElement.config.videoUrl = el.attr('src');
                    } else {
                        // Generic iframe or valid HTML block
                        newElement.type = 'html';
                        newElement.height = parseInt(el.attr('height')) || 400;
                        newElement.config.customContent = $.html(element);
                    }
                    break;

                case 'div':
                case 'section':
                case 'article':
                    // For container tags, simply treat as body text or HTML block depending on complexity
                    // Simple heuristic: if it has mostly text, treat as body. If complex, HTML.
                    if (el.find('div, img, iframe, table').length > 0) {
                        newElement.type = 'html';
                        newElement.height = 300; // Arbitrary
                        newElement.config.customContent = $.html(element);
                    } else {
                        newElement.type = 'body';
                        newElement.height = Math.max(60, Math.ceil(el.text().length / 100) * 25);
                        newElement.config.customContent = el.text().trim();
                    }
                    break;

                default:
                    // Fallback to HTML block
                    newElement.type = 'html';
                    newElement.height = 100;
                    newElement.config.customContent = $.html(element);
                    break;
            }

            // Skip empty text nodes processed as elements
            if ((newElement.type === 'body' || newElement.type === 'header') && !newElement.config.customContent) {
                return;
            }

            elements.push(newElement);
            currentY += newElement.height + 20; // Add spacing
        });

        // Ensure at least one element
        if (elements.length === 0) {
            elements.push({
                id: `el-${Date.now()}`,
                type: 'html',
                x: PADDING,
                y: 0,
                width: CONTENT_WIDTH,
                height: 1000,
                zIndex: 1,
                config: { customContent: htmlContent }
            });
        }

        return elements;
    }

    /**
     * Extracts inline styles and maps them to Freeform config
     */
    extractStyles(el) {
        const styleString = el.attr('style') || '';
        const styles = {};

        if (!styleString) return styles;

        // Simple parser for inline styles
        styleString.split(';').forEach(style => {
            const [key, value] = style.split(':').map(s => s.trim());
            if (!key || !value) return;

            switch (key) {
                case 'color': styles.textColor = value; break;
                case 'background-color': styles.backgroundColor = value; break;
                case 'text-align': styles.textAlign = value; break;
                case 'font-weight': styles.fontWeight = value; break;
                case 'font-size': styles.fontSize = this.mapFontSize(value); break;
                // Add more mappings as needed
            }
        });

        return styles;
    }

    mapFontSize(val) {
        // Rough mapping
        if (val.includes('px')) {
            const px = parseInt(val);
            if (px > 30) return '4xl';
            if (px > 24) return '2xl';
            if (px > 18) return 'lg';
            if (px < 14) return 'sm';
        }
        return 'base';
    }
}

module.exports = new HtmlParserService();
