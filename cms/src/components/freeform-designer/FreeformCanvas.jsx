import React, { useRef, useState, useEffect, useCallback } from 'react';
import FreeformElement from './FreeformElement';

/**
 * Sample article data for preview mode
 */
const SAMPLE_ARTICLE = {
    article_header_en: 'Breaking: Major Policy Changes Announced by Government',
    summary_en: 'The government has announced sweeping policy changes that will affect millions of citizens.',
    body_en: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula.

Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor. Ut in nulla enim. Phasellus molestie magna non est bibendum non venenatis nisl tempor.`,
    author: 'Nisha Mishra',
    createdAt: new Date().toISOString(),
    tags_en: ['Politics', 'Economy', 'Breaking News'],
    photos: ['https://placehold.co/800x450?text=Featured+Image']
};

/**
 * FreeformCanvas - The main canvas with free positioning, drag, resize
 */
const FreeformCanvas = ({
    elements,
    selectedIds,
    onSelectElement,
    onSelectMultiple,
    onClearSelection,
    onUpdateElement,
    onDeleteElement,
    canvas,
    zoom,
    panOffset,
    onPanChange,
    previewMode,
    snapToElements,
    onElementChangeEnd,
    editorMode = 'layout',
    articleData = {},
    onContentChange,
    tool = 'select' // 'select' or 'hand'
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isPanning, setIsPanning] = useState(false);
    const [dragStartPos, setDragStartPos] = useState(null);
    const [selectionBox, setSelectionBox] = useState(null);
    const [alignmentGuides, setAlignmentGuides] = useState({ vertical: [], horizontal: [] });

    // Handle canvas click (deselect)
    const handleCanvasClick = (e) => {
        if (tool === 'hand') return; // Don't deselect when in hand mode if clicking around
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-inner')) {
            onClearSelection();
        }
    };

    // Handle mouse wheel for zoom/pan
    const handleWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            // Zoom with ctrl/cmd + scroll
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            // Zoom is handled in parent
        } else {
            // Pan with scroll
            onPanChange({
                x: panOffset.x - e.deltaX * 0.5,
                y: panOffset.y - e.deltaY * 0.5
            });
        }
    }, [panOffset, onPanChange]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
            return () => container.removeEventListener('wheel', handleWheel);
        }
    }, [handleWheel]);

    // Pan handling
    const handleMouseDown = (e) => {
        const isMiddleClick = e.button === 1;
        const isHandToolClick = tool === 'hand' && e.button === 0;

        if (isMiddleClick || isHandToolClick) {
            e.preventDefault();
            setIsPanning(true);
            setDragStartPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        } else if (e.button === 0 && (e.target === canvasRef.current || e.target.classList.contains('canvas-inner'))) {
            // Start selection box (only if NOT in hand mode)
            const rect = canvasRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        }
    };

    const handleMouseMove = (e) => {
        if (isPanning && dragStartPos) {
            onPanChange({
                x: e.clientX - dragStartPos.x,
                y: e.clientY - dragStartPos.y
            });
        } else if (selectionBox) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            setSelectionBox({ ...selectionBox, endX: x, endY: y });
        }
    };

    const handleMouseUp = (e) => {
        if (isPanning) {
            setIsPanning(false);
            setDragStartPos(null);
        }

        if (selectionBox) {
            // Calculate selection box bounds
            const minX = Math.min(selectionBox.startX, selectionBox.endX);
            const maxX = Math.max(selectionBox.startX, selectionBox.endX);
            const minY = Math.min(selectionBox.startY, selectionBox.endY);
            const maxY = Math.max(selectionBox.startY, selectionBox.endY);

            // Find elements within selection box
            const selectedElementIds = elements
                .filter(el => {
                    const elRight = el.x + el.width;
                    const elBottom = el.y + el.height;
                    return el.x < maxX && elRight > minX && el.y < maxY && elBottom > minY;
                })
                .map(el => el.id);

            if (selectedElementIds.length > 0) {
                onSelectMultiple(selectedElementIds);
            }
            setSelectionBox(null);
        }
    };

    // Calculate alignment guides when dragging
    const calculateAlignmentGuides = useCallback((draggingId, newX, newY, newWidth, newHeight) => {
        if (!snapToElements) {
            setAlignmentGuides({ vertical: [], horizontal: [] });
            return { x: newX, y: newY };
        }

        const SNAP_THRESHOLD = 5;
        const vertical = [];
        const horizontal = [];
        let snappedX = newX;
        let snappedY = newY;

        const otherElements = elements.filter(el => !selectedIds.includes(el.id));

        otherElements.forEach(el => {
            // Vertical alignment (left, center, right edges)
            const targetEdges = [el.x, el.x + el.width / 2, el.x + el.width];
            const sourceEdges = [newX, newX + newWidth / 2, newX + newWidth];

            targetEdges.forEach(targetX => {
                sourceEdges.forEach((sourceX, idx) => {
                    if (Math.abs(targetX - sourceX) < SNAP_THRESHOLD) {
                        vertical.push(targetX);
                        if (idx === 0) snappedX = targetX;
                        else if (idx === 1) snappedX = targetX - newWidth / 2;
                        else snappedX = targetX - newWidth;
                    }
                });
            });

            // Horizontal alignment (top, center, bottom edges)
            const targetYEdges = [el.y, el.y + el.height / 2, el.y + el.height];
            const sourceYEdges = [newY, newY + newHeight / 2, newY + newHeight];

            targetYEdges.forEach(targetY => {
                sourceYEdges.forEach((sourceY, idx) => {
                    if (Math.abs(targetY - sourceY) < SNAP_THRESHOLD) {
                        horizontal.push(targetY);
                        if (idx === 0) snappedY = targetY;
                        else if (idx === 1) snappedY = targetY - newHeight / 2;
                        else snappedY = targetY - newHeight;
                    }
                });
            });
        });

        // Canvas edge snapping
        [0, canvas.width / 2, canvas.width].forEach(edgeX => {
            [newX, newX + newWidth / 2, newX + newWidth].forEach((sourceX, idx) => {
                if (Math.abs(edgeX - sourceX) < SNAP_THRESHOLD) {
                    vertical.push(edgeX);
                    if (idx === 0) snappedX = edgeX;
                    else if (idx === 1) snappedX = edgeX - newWidth / 2;
                    else snappedX = edgeX - newWidth;
                }
            });
        });

        [0, canvas.height / 2, canvas.height].forEach(edgeY => {
            [newY, newY + newHeight / 2, newY + newHeight].forEach((sourceY, idx) => {
                if (Math.abs(edgeY - sourceY) < SNAP_THRESHOLD) {
                    horizontal.push(edgeY);
                    if (idx === 0) snappedY = edgeY;
                    else if (idx === 1) snappedY = edgeY - newHeight / 2;
                    else snappedY = edgeY - newHeight;
                }
            });
        });

        setAlignmentGuides({ vertical: [...new Set(vertical)], horizontal: [...new Set(horizontal)] });
        return { x: snappedX, y: snappedY };
    }, [elements, selectedIds, snapToElements, canvas]);

    const clearAlignmentGuides = useCallback(() => {
        setAlignmentGuides({ vertical: [], horizontal: [] });
    }, []);

    // Get element preview content
    const getElementContent = (element) => {
        const { id, type, config } = element;
        const isArticleMode = editorMode === 'article';
        const value = articleData[id] || '';

        switch (type) {
            case 'header':
                return isArticleMode ? (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onContentChange(id, e.target.value)}
                        placeholder="Enter headline..."
                        className="w-full h-full bg-transparent border-none outline-none resize-none"
                        style={{
                            fontSize: getFontSize(config.fontSize),
                            fontWeight: config.fontWeight || 'bold',
                            fontFamily: config.fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
                            color: config.textColor || '#1f2937',
                            textAlign: config.textAlign || 'left'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center overflow-hidden"
                        style={{
                            fontSize: getFontSize(config.fontSize),
                            fontWeight: config.fontWeight || 'bold',
                            fontFamily: config.fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
                            color: config.textColor || '#1f2937',
                            textAlign: config.textAlign || 'left'
                        }}
                    >
                        {SAMPLE_ARTICLE.article_header_en}
                    </div>
                );

            case 'summary':
                return isArticleMode ? (
                    <textarea
                        value={value}
                        onChange={(e) => onContentChange(id, e.target.value)}
                        placeholder="Enter summary..."
                        className="w-full h-full bg-transparent border-none outline-none resize-none p-1"
                        style={{
                            fontSize: getFontSize(config.fontSize),
                            fontFamily: config.fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
                            color: config.textColor || '#6b7280',
                            lineHeight: getLineHeight(config.lineHeight)
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div
                        className="w-full h-full overflow-hidden"
                        style={{
                            fontSize: getFontSize(config.fontSize),
                            fontFamily: config.fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
                            color: config.textColor || '#6b7280',
                            lineHeight: getLineHeight(config.lineHeight)
                        }}
                    >
                        {SAMPLE_ARTICLE.summary_en}
                    </div>
                );

            case 'body':
                return isArticleMode ? (
                    <textarea
                        value={value}
                        onChange={(e) => onContentChange(id, e.target.value)}
                        placeholder="Write your article body here..."
                        className="w-full h-full bg-transparent border-none outline-none resize-none p-1"
                        style={{
                            fontSize: getFontSize(config.fontSize),
                            fontFamily: config.fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
                            color: config.textColor || '#374151',
                            lineHeight: getLineHeight(config.lineHeight)
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div
                        className="w-full h-full overflow-hidden"
                        style={{
                            fontSize: getFontSize(config.fontSize),
                            fontFamily: config.fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
                            color: config.textColor || '#374151',
                            lineHeight: getLineHeight(config.lineHeight)
                        }}
                    >
                        {SAMPLE_ARTICLE.body_en}
                    </div>
                );

            case 'image':
                const imageUrl = isArticleMode ? value : (config.imageUrl || SAMPLE_ARTICLE.photos[0]);
                return isArticleMode ? (
                    <div className="w-full h-full relative">
                        {value ? (
                            <img
                                src={value}
                                alt="Content"
                                className="w-full h-full"
                                style={{
                                    objectFit: config.objectFit || 'cover',
                                    borderRadius: config.borderRadius || 0
                                }}
                                draggable={false}
                            />
                        ) : (
                            <div
                                className="w-full h-full bg-slate-200 flex items-center justify-center"
                                style={{ borderRadius: config.borderRadius || 0 }}
                            >
                                <span className="text-slate-500 text-sm">Click to add image URL</span>
                            </div>
                        )}
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => onContentChange(id, e.target.value)}
                            placeholder="Paste image URL..."
                            className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 border-none outline-none opacity-0 hover:opacity-100 focus:opacity-100 transition"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ) : (
                    <img
                        src={imageUrl}
                        alt="Content"
                        className="w-full h-full"
                        style={{
                            objectFit: config.objectFit || 'cover',
                            borderRadius: config.borderRadius || 0
                        }}
                        draggable={false}
                    />
                );

            case 'video':
                return isArticleMode ? (
                    <div className="w-full h-full relative">
                        <div
                            className="w-full h-full bg-slate-800 flex items-center justify-center"
                            style={{ borderRadius: config.borderRadius || 0 }}
                        >
                            {value ? (
                                <iframe
                                    src={value.replace('watch?v=', 'embed/')}
                                    className="w-full h-full"
                                    style={{ borderRadius: config.borderRadius || 0 }}
                                    allowFullScreen
                                />
                            ) : (
                                <div className="text-white/50 text-center">
                                    <div className="text-4xl mb-2">▶</div>
                                    <div className="text-sm">Add video URL below</div>
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => onContentChange(id, e.target.value)}
                            placeholder="Paste YouTube URL..."
                            className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 border-none outline-none"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ) : (
                    <div
                        className="w-full h-full bg-slate-800 flex items-center justify-center"
                        style={{ borderRadius: config.borderRadius || 0 }}
                    >
                        <div className="text-white/50 text-center">
                            <div className="text-4xl mb-2">▶</div>
                            <div className="text-sm">Video Player</div>
                        </div>
                    </div>
                );

            case 'author':
                return isArticleMode ? (
                    <div className="flex items-center gap-2 h-full">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium flex-shrink-0">
                            {(value || 'A').charAt(0).toUpperCase()}
                        </div>
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => onContentChange(id, e.target.value)}
                            placeholder="Author name..."
                            className="flex-1 bg-transparent border-none outline-none"
                            style={{
                                fontSize: getFontSize(config.fontSize),
                                color: config.textColor || '#6b7280'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ) : (
                    <div
                        className="flex items-center gap-2 h-full"
                        style={{
                            fontSize: getFontSize(config.fontSize),
                            color: config.textColor || '#6b7280'
                        }}
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                            {SAMPLE_ARTICLE.author.charAt(0)}
                        </div>
                        <span>{SAMPLE_ARTICLE.author}</span>
                    </div>
                );

            case 'date':
                return (
                    <div
                        className="flex items-center h-full"
                        style={{
                            fontSize: getFontSize(config.fontSize),
                            color: config.textColor || '#9ca3af'
                        }}
                    >
                        {new Date(SAMPLE_ARTICLE.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </div>
                );

            case 'tags':
                const tags = isArticleMode ? (value || '').split(',').filter(t => t.trim()) : SAMPLE_ARTICLE.tags_en;
                return isArticleMode ? (
                    <div className="flex flex-wrap gap-2 items-center h-full">
                        {tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full"
                            >
                                {tag.trim()}
                            </span>
                        ))}
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => onContentChange(id, e.target.value)}
                            placeholder="Enter tags (comma-separated)..."
                            className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-xs"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 items-center h-full">
                        {tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                );

            case 'text':
                return (
                    <div
                        className="w-full h-full overflow-hidden p-2"
                        style={{
                            fontSize: getFontSize(config.fontSize),
                            color: config.textColor || '#374151'
                        }}
                    >
                        {config.customContent || 'Custom text content...'}
                    </div>
                );

            case 'divider':
                return (
                    <div
                        className="w-full h-full flex items-center"
                    >
                        <div
                            className="w-full"
                            style={{
                                height: 2,
                                backgroundColor: config.backgroundColor || '#e5e7eb'
                            }}
                        />
                    </div>
                );

            case 'spacer':
                return (
                    <div className="w-full h-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                        Spacer
                    </div>
                );

            case 'shape':
                const shapeStyle = {
                    width: '100%',
                    height: '100%',
                    backgroundColor: config.fillColor || '#4f46e5',
                    borderRadius: config.shapeType === 'circle' ? '50%' : config.borderRadius || 0,
                    border: config.strokeWidth ? `${config.strokeWidth}px solid ${config.strokeColor || '#4f46e5'}` : 'none'
                };
                return <div style={shapeStyle} />;

            case 'container':
                return (
                    <div
                        className="w-full h-full"
                        style={{
                            backgroundColor: config.backgroundColor || '#f9fafb',
                            borderRadius: config.borderRadius || 0,
                            border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#e5e7eb'}` : 'none'
                        }}
                    />
                );

            default:
                return (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500">
                        [{type}]
                    </div>
                );
        }
    };

    const getFontSize = (size) => {
        const sizes = {
            'xs': '0.75rem', 'sm': '0.875rem', 'base': '1rem', 'lg': '1.125rem',
            'xl': '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem'
        };
        return sizes[size] || '1rem';
    };

    const getLineHeight = (lh) => {
        const heights = { 'tight': 1.25, 'normal': 1.5, 'relaxed': 1.625, 'loose': 2 };
        return heights[lh] || 1.5;
    };

    // Sort elements by z-index for rendering
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-hidden"
            style={{
                cursor: isPanning ? 'grabbing' : tool === 'hand' ? 'grab' : 'default',
                userSelect: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div
                ref={canvasRef}
                className="canvas-inner"
                onClick={handleCanvasClick}
                style={{
                    width: canvas.width,
                    height: canvas.height,
                    backgroundColor: canvas.backgroundColor,
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                    transformOrigin: 'top left',
                    position: 'relative',
                    margin: '40px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    borderRadius: '4px',
                    backgroundImage: canvas.showGrid && !previewMode
                        ? `linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
                           linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)`
                        : 'none',
                    backgroundSize: canvas.showGrid ? `${canvas.gridSize}px ${canvas.gridSize}px` : 'auto'
                }}
            >
                {/* Elements */}
                {sortedElements.map(element => (
                    <FreeformElement
                        key={element.id}
                        element={element}
                        isSelected={selectedIds.includes(element.id)}
                        previewMode={previewMode}
                        onSelect={(e) => onSelectElement(element.id, e.shiftKey || e.metaKey || e.ctrlKey)}
                        onUpdate={(updates) => onUpdateElement(element.id, updates)}
                        onDelete={() => onDeleteElement(element.id)}
                        onDragStart={() => { }}
                        onDrag={(newX, newY) => {
                            const snapped = calculateAlignmentGuides(element.id, newX, newY, element.width, element.height);
                            return snapped;
                        }}
                        onDragEnd={() => {
                            clearAlignmentGuides();
                            if (onElementChangeEnd) onElementChangeEnd(element);
                        }}
                        onResizeEnd={() => {
                            if (onElementChangeEnd) onElementChangeEnd(element);
                        }}
                        zoom={zoom}
                    >
                        {getElementContent(element)}
                    </FreeformElement>
                ))}

                {/* Alignment Guides */}
                {alignmentGuides.vertical.map((x, idx) => (
                    <div
                        key={`v-${idx}`}
                        className="absolute top-0 bottom-0 pointer-events-none"
                        style={{
                            left: x,
                            width: 1,
                            backgroundColor: '#10b981',
                            zIndex: 10000
                        }}
                    />
                ))}
                {alignmentGuides.horizontal.map((y, idx) => (
                    <div
                        key={`h-${idx}`}
                        className="absolute left-0 right-0 pointer-events-none"
                        style={{
                            top: y,
                            height: 1,
                            backgroundColor: '#10b981',
                            zIndex: 10000
                        }}
                    />
                ))}

                {/* Selection Box */}
                {selectionBox && (
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            left: Math.min(selectionBox.startX, selectionBox.endX),
                            top: Math.min(selectionBox.startY, selectionBox.endY),
                            width: Math.abs(selectionBox.endX - selectionBox.startX),
                            height: Math.abs(selectionBox.endY - selectionBox.startY),
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            border: '1px solid rgba(79, 70, 229, 0.5)',
                            zIndex: 10001
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default FreeformCanvas;
