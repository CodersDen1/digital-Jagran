import React from 'react';
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
    Square
} from 'lucide-react';

/**
 * Available element types with their icons and labels
 */
const ELEMENT_TYPES = [
    { type: 'header', label: 'Headline', icon: Type, description: 'Article title/headline' },
    { type: 'summary', label: 'Summary', icon: FileText, description: 'Article lead/summary' },
    { type: 'body', label: 'Body', icon: AlignLeft, description: 'Main article content' },
    { type: 'image', label: 'Image', icon: Image, description: 'Featured image' },
    { type: 'video', label: 'Video', icon: Video, description: 'Embedded video' },
    { type: 'author', label: 'Author', icon: User, description: 'Author information' },
    { type: 'date', label: 'Date', icon: Calendar, description: 'Published date' },
    { type: 'tags', label: 'Tags', icon: Tag, description: 'Article tags/categories' },
    { type: 'text', label: 'Custom Text', icon: Type, description: 'Custom text block' },
    { type: 'divider', label: 'Divider', icon: Minus, description: 'Horizontal line' },
    { type: 'spacer', label: 'Spacer', icon: Square, description: 'Empty space' },
];

/**
 * LayoutToolbar - Left sidebar with draggable element types
 */
const LayoutToolbar = ({ onAddElement }) => {
    return (
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Elements
                </h3>

                <div className="space-y-2">
                    {ELEMENT_TYPES.map(({ type, label, icon: Icon, description }) => (
                        <button
                            key={type}
                            onClick={() => onAddElement(type)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition group text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                                <Icon size={20} />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 text-sm">{label}</div>
                                <div className="text-xs text-gray-500">{description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tips Section */}
            <div className="p-4 border-t border-gray-200 mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Tips
                </h4>
                <ul className="text-xs text-gray-500 space-y-2">
                    <li>• Click elements to add them to the canvas</li>
                    <li>• Select an element to edit its properties</li>
                    <li>• Use arrows to reorder elements</li>
                    <li>• Adjust width using the properties panel</li>
                </ul>
            </div>
        </div>
    );
};

export default LayoutToolbar;
