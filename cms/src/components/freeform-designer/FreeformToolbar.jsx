import React, { useState } from 'react';
import {
    Type,
    FileText,
    Image,
    Video,
    User,
    Calendar,
    Tag,
    AlignLeft,
    Minus,
    Square,
    Circle,
    Triangle,
    Layers,
    ChevronDown,
    ChevronRight,
    Eye,
    EyeOff,
    Lock,
    GripVertical
} from 'lucide-react';

/**
 * Available element types for the freeform editor
 */
const ELEMENT_TYPES = [
    { type: 'header', label: 'Headline', icon: Type, description: 'Article title' },
    { type: 'summary', label: 'Summary', icon: FileText, description: 'Lead paragraph' },
    { type: 'body', label: 'Body', icon: AlignLeft, description: 'Main content' },
    { type: 'image', label: 'Image', icon: Image, description: 'Photo/image' },
    { type: 'video', label: 'Video', icon: Video, description: 'Embedded video' },
    { type: 'author', label: 'Author', icon: User, description: 'Author info' },
    { type: 'date', label: 'Date', icon: Calendar, description: 'Publish date' },
    { type: 'tags', label: 'Tags', icon: Tag, description: 'Categories' },
    { type: 'text', label: 'Custom Text', icon: Type, description: 'Free text' },
    { type: 'divider', label: 'Divider', icon: Minus, description: 'Horizontal line' },
    { type: 'spacer', label: 'Spacer', icon: Square, description: 'Empty space' },
];

const SHAPE_TYPES = [
    { type: 'shape', shapeType: 'rectangle', label: 'Rectangle', icon: Square },
    { type: 'shape', shapeType: 'circle', label: 'Circle', icon: Circle },
    { type: 'container', label: 'Container', icon: Square, description: 'Group box' },
];

/**
 * FreeformToolbar - Left sidebar with element palette and layers panel
 */
const FreeformToolbar = ({
    onAddElement,
    elements,
    selectedIds,
    onSelectElement,
    onReorderLayers
}) => {
    const [activeTab, setActiveTab] = useState('elements');
    const [expandedSections, setExpandedSections] = useState({
        content: true,
        shapes: true
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Handle drag start for elements
    const handleDragStart = (e, type, shapeType = null) => {
        e.dataTransfer.setData('element-type', type);
        if (shapeType) {
            e.dataTransfer.setData('shape-type', shapeType);
        }
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Layers panel - sorted by z-index (highest first)
    const sortedLayers = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    return (
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden shrink-0">
            {/* Tab Headers */}
            <div className="flex border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('elements')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeTab === 'elements'
                            ? 'bg-slate-700 text-white border-b-2 border-indigo-500'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                >
                    Elements
                </button>
                <button
                    onClick={() => setActiveTab('layers')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition ${activeTab === 'layers'
                            ? 'bg-slate-700 text-white border-b-2 border-indigo-500'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <Layers size={14} />
                        Layers
                    </span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {activeTab === 'elements' ? (
                    <div className="p-3 space-y-4">
                        {/* Content Elements */}
                        <div>
                            <button
                                onClick={() => toggleSection('content')}
                                className="flex items-center gap-2 w-full text-left text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 hover:text-white transition"
                            >
                                {expandedSections.content ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                Content
                            </button>

                            {expandedSections.content && (
                                <div className="grid grid-cols-2 gap-2">
                                    {ELEMENT_TYPES.map(({ type, label, icon: Icon }) => (
                                        <div
                                            key={type}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, type)}
                                            onClick={() => onAddElement(type)}
                                            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-700/50 border border-slate-600 hover:border-indigo-500 hover:bg-slate-700 cursor-grab active:cursor-grabbing transition group"
                                        >
                                            <div className="w-8 h-8 rounded-md bg-slate-600 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition">
                                                <Icon size={16} />
                                            </div>
                                            <span className="text-xs text-slate-300 group-hover:text-white">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Shapes */}
                        <div>
                            <button
                                onClick={() => toggleSection('shapes')}
                                className="flex items-center gap-2 w-full text-left text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 hover:text-white transition"
                            >
                                {expandedSections.shapes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                Shapes & Containers
                            </button>

                            {expandedSections.shapes && (
                                <div className="grid grid-cols-2 gap-2">
                                    {SHAPE_TYPES.map(({ type, shapeType, label, icon: Icon }) => (
                                        <div
                                            key={`${type}-${shapeType || ''}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, type, shapeType)}
                                            onClick={() => onAddElement(type)}
                                            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-700/50 border border-slate-600 hover:border-indigo-500 hover:bg-slate-700 cursor-grab active:cursor-grabbing transition group"
                                        >
                                            <div className="w-8 h-8 rounded-md bg-slate-600 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition">
                                                <Icon size={16} />
                                            </div>
                                            <span className="text-xs text-slate-300 group-hover:text-white">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Layers Panel */
                    <div className="p-2">
                        {sortedLayers.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                No elements on canvas
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {sortedLayers.map((element, index) => {
                                    const Icon = ELEMENT_TYPES.find(t => t.type === element.type)?.icon || Square;
                                    const isSelected = selectedIds.includes(element.id);

                                    return (
                                        <div
                                            key={element.id}
                                            onClick={() => onSelectElement(element.id)}
                                            className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition ${isSelected
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'hover:bg-slate-700 text-slate-300'
                                                }`}
                                        >
                                            <GripVertical size={14} className="text-slate-500 cursor-grab" />
                                            <Icon size={14} />
                                            <span className="flex-1 text-sm truncate capitalize">
                                                {element.type}
                                            </span>

                                            {/* Layer indicators */}
                                            <div className="flex items-center gap-1">
                                                {element.locked && (
                                                    <Lock size={12} className="text-amber-400" />
                                                )}
                                                {!element.visible && (
                                                    <EyeOff size={12} className="text-slate-500" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tips Section */}
            {activeTab === 'elements' && (
                <div className="p-3 border-t border-slate-700 bg-slate-800/50">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Tips
                    </h4>
                    <ul className="text-xs text-slate-500 space-y-1">
                        <li>• Drag elements onto the canvas</li>
                        <li>• Click to select, Shift+Click for multi-select</li>
                        <li>• Use arrow keys to nudge elements</li>
                        <li>• Cmd+[ / Cmd+] to change layer order</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default FreeformToolbar;
