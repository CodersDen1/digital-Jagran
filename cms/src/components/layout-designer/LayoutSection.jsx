import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import LayoutElement from './LayoutElement';

/**
 * LayoutSection - A multi-column container for other elements
 */
const LayoutSection = ({
    sectionElement,
    allElements,
    previewMode,
    onSelectElement,
    onUpdateElement,
    onDeleteElement,
    onMoveUp,
    onMoveDown,
    onReorder,
    onMoveToContainer,
    onAddElementToContainer,
    selectedElementId
}) => {
    // State for the "Add Element" popover
    const [activeAddColumn, setActiveAddColumn] = useState(null);

    // List of quick add elements
    const QUICK_ADD_ELEMENTS = [
        { type: 'header', label: 'Headline' },
        { type: 'summary', label: 'Summary' },
        { type: 'body', label: 'Body' },
        { type: 'image', label: 'Image' },
        { type: 'text', label: 'Custom Text' }
    ];

    // Get children for this section
    const children = allElements.filter(el => el.parentId === sectionElement.id);

    // Sort logic handled in render

    // Grid Configuration
    const columns = sectionElement.config?.columns || 2;
    const ratio = sectionElement.config?.ratio || 'equal';

    // Determine Grid Class or Style
    let gridStyle = {};
    let gridClass = `grid gap-4 w-full h-full`; // h-full ensures stretching

    if (ratio === 'equal') {
        gridClass += ` grid-cols-${columns}`;
    } else {
        // Custom ratios (mostly for 2 columns, but can extend)
        if (columns === 2) {
            switch (ratio) {
                case '1:2': gridStyle = { gridTemplateColumns: '1fr 2fr' }; break;
                case '2:1': gridStyle = { gridTemplateColumns: '2fr 1fr' }; break;
                case '1:3': gridStyle = { gridTemplateColumns: '1fr 3fr' }; break;
                case '3:1': gridStyle = { gridTemplateColumns: '3fr 1fr' }; break;
                default: gridClass += ` grid-cols-${columns}`;
            }
        } else {
            gridClass += ` grid-cols-${columns}`; // Fallback for >2 cols
        }
    }

    // Helper to get children for a specific column
    const getColumnChildren = (colIndex) => {
        return children
            .filter(el => (el.column || 0) === colIndex)
            .sort((a, b) => a.row - b.row);
    };

    // Handle Drop into a column
    const handleDrop = (e, colIndex) => {
        if (previewMode) return;
        e.preventDefault();
        e.stopPropagation();

        try {
            // Check if it's a new element being dragged from toolbar (not yet implemented in toolbar drag)
            // Or existing element reordering

            // For now, assuming reordering within canvas
            const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
            // If dataTransfer has "type", it's a new element (handled by parent logic usually?)
            // Actually, we need to know if we are moving an existing element into this column.

            // WE NEED TO FIND THE ELEMENT BY INDEX FROM THE FLAT LIST
            // But the index passed by LayoutElement is the index in the *sorted list* of that context.
            // This is tricky.

            // Instead of index, let's try to pass ID in dataTransfer if possible, or mapping.
            // LayoutElement uses `index` which is local to the mapping.

            // Let's rely on `onReorder` if it handles ID. `LayoutDesigner.reorderElements` handles indexes of the flat list.
            // This approach needs refinement for nested DnD.

            // ALTERNATIVE:
            // Let's make `LayoutElement` pass `element.id` in dataTransfer if generic DnD is needed.
            // But `LayoutDesigner` expects index.

            // Let's pause and think: The existing DnD uses `reorderElements(startIndex, endIndex)`.
            // This swaps elements in the flat array.
            // It implies we are staying in the same context (root).

            // To move INTO a section, we need to update `parentId` and `column`.
            // This is a DIFFERENT operation than `reorder`.
            // It's `moveElementToContainer(elementId, targetContainerId, targetColumn, targetRow)`.
        } catch (err) {
            console.error(err);
        }
    };

    // We can't easily reuse getElementContent from LayoutCanvas because it's inside the component.
    // We will need to pass a renderer or duplicate the simple switch case.
    const getElementContent = (element) => {
        const { type, config } = element;
        const SAMPLE_ARTICLE = {
            article_header_en: 'Breaking: Major Policy Changes Announced',
            summary_en: 'The government has announced sweeping policy changes that will affect millions.',
            body_en: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            author: 'Nisha Mishra',
            createdAt: new Date().toISOString(),
            tags_en: ['Politics', 'Economy'],
            photos: ['https://placehold.co/800x450']
        };

        switch (type) {
            case 'header': return SAMPLE_ARTICLE.article_header_en;
            case 'summary': return SAMPLE_ARTICLE.summary_en;
            case 'body': return SAMPLE_ARTICLE.body_en;
            case 'image': return <img src={SAMPLE_ARTICLE.photos[0]} className="w-full h-full object-cover" style={{ aspectRatio: config.aspectRatio || '16/9' }} />;
            case 'text': return config.customContent || 'Custom text';
            default: return `[${type}]`;
        }
    };

    // We need a way to handle "Drop on Column" event specifically.
    // We will attach `onDrop` to the column div.

    // NOTE: We need to update `LayoutElement` to send ID as well, or `LayoutCanvas` to handle global lookup.
    // For now, I will implement the visual structure. The DnD logic might need a broader refactor 
    // to support moving between contexts (Root -> Section).

    return (
        <div className={gridClass} style={gridStyle}>
            {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                    key={colIndex}
                    className={`min-h-[100px] border-2 border-dashed rounded-lg p-2 transition-colors relative ${previewMode ? 'border-transparent' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                        }`}
                    onDrop={(e) => handleDrop(e, colIndex)}
                    onDragOver={(e) => e.preventDefault()}
                >
                    {getColumnChildren(colIndex).map((child, index) => (
                        <LayoutElement
                            key={child.id}
                            element={child}
                            index={index}
                            isSelected={child.id === selectedElementId}
                            previewMode={previewMode}
                            onSelect={() => onSelectElement(child.id)}
                            onUpdate={(updates) => onUpdateElement(child.id, updates)}
                            onDelete={() => onDeleteElement(child.id)}
                            onMoveUp={() => onMoveUp(child.id)}
                            onMoveDown={() => onMoveDown(child.id)}
                            onReorder={onReorder}
                            isFirst={index === 0}
                            isLast={index === getColumnChildren(colIndex).length - 1}
                        >
                            <div className="">
                                {getElementContent(child)}
                            </div>
                        </LayoutElement>
                    ))}

                    {!previewMode && (
                        <div className={`h-full flex flex-col ${getColumnChildren(colIndex).length === 0 ? 'justify-center items-center' : ''} py-2`}>
                            {/* Add Button - Always visible */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveAddColumn(activeAddColumn === colIndex ? null : colIndex);
                                }}
                                className={`mt-2 p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition flex items-center justify-center mx-auto ${getColumnChildren(colIndex).length === 0 ? 'scale-125' : ''}`}
                                title="Add Element"
                            >
                                <Plus size={20} />
                            </button>

                            {/* Popover Menu */}
                            {activeAddColumn === colIndex && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-10 w-48 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">Add Element</div>
                                    <div className="space-y-1">
                                        {QUICK_ADD_ELEMENTS.map((item) => (
                                            <button
                                                key={item.type}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAddElementToContainer(item.type, sectionElement.id, colIndex);
                                                    setActiveAddColumn(null);
                                                }}
                                                className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded flex items-center gap-2"
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveAddColumn(null);
                                        }}
                                        className="mt-2 w-full text-xs text-center text-gray-400 hover:text-gray-600 py-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default LayoutSection;
