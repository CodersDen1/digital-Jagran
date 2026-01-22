import React from 'react';
import { ChevronUp, ChevronDown, Trash2, GripVertical } from 'lucide-react';

/**
 * Element type labels
 */
const TYPE_LABELS = {
    header: 'Headline',
    summary: 'Summary',
    body: 'Body',
    image: 'Image',
    video: 'Video',
    author: 'Author',
    date: 'Date',
    tags: 'Tags',
    text: 'Custom Text',
    divider: 'Divider',
    spacer: 'Spacer'
};

/**
 * LayoutElement - Wrapper component for each layout element in the canvas
 * Provides selection, reordering, and deletion controls
 */
const LayoutElement = ({
    element,
    isSelected,
    previewMode,
    onSelect,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
    onReorder,
    index,
    isFirst,
    isLast,
    children
}) => {
    const handleClick = (e) => {
        if (!previewMode) {
            e.stopPropagation();
            onSelect();
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e) => {
        if (previewMode) return;
        e.dataTransfer.setData('text/plain', index);
        e.dataTransfer.effectAllowed = 'move';
        // Set opacity to make it look like it's being moved
        e.target.style.opacity = '0.5';
    };

    const handleDragOver = (e) => {
        if (previewMode) return;
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e) => {
        if (previewMode) return;
        e.preventDefault();
        e.stopPropagation();
        e.target.style.opacity = '1';

        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetIndex = index;

        if (sourceIndex !== targetIndex && !isNaN(sourceIndex)) {
            onReorder(sourceIndex, targetIndex);
        }
    };

    // Reset opacity if drag ends without drop
    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
    };

    // Calculate grid column span
    const gridColumnStyle = {
        gridColumn: `span ${element.width} / span ${element.width}`
    };

    // In preview mode, just render the content
    if (previewMode) {
        return (
            <div style={gridColumnStyle}>
                {children}
            </div>
        );
    }

    return (
        <div
            draggable={!previewMode}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            style={gridColumnStyle}
            className={`relative group transition-all ${isSelected
                ? 'ring-2 ring-primary ring-offset-2 rounded-lg'
                : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1 rounded-lg'
                } ${!previewMode ? 'cursor-move' : ''}`}
        >
            {/* Element Type Label */}
            <div
                className={`absolute -top-6 left-0 text-xs font-medium px-2 py-0.5 rounded transition-opacity ${isSelected
                    ? 'bg-primary text-white opacity-100'
                    : 'bg-gray-100 text-gray-500 opacity-0 group-hover:opacity-100'
                    }`}
            >
                {TYPE_LABELS[element.type] || element.type}
            </div>

            {/* Controls */}
            <div
                className={`absolute -right-10 top-0 flex flex-col gap-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
            >
                {/* Move Up */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onMoveUp();
                    }}
                    disabled={isFirst}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                >
                    <ChevronUp size={16} />
                </button>

                {/* Move Down */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onMoveDown();
                    }}
                    disabled={isLast}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                >
                    <ChevronDown size={16} />
                </button>

                {/* Delete */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this element?')) {
                            onDelete();
                        }
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    title="Delete element"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Drag Handle (Visual and functional cue) */}
            <div
                className={`absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
            >
                <GripVertical size={20} className="text-gray-400" />
            </div>

            {/* Content */}
            <div className="min-h-[40px]">
                {children}
            </div>

            {/* Width Indicator */}
            <div
                className={`absolute -bottom-5 left-0 text-xs text-gray-400 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                Width: {element.width}/12 columns
            </div>
        </div>
    );
};

export default LayoutElement;
