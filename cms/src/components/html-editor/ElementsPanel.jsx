import React from 'react';
import {
    Type, Image as ImageIcon, Layout, Box,
    Link as LinkIcon, Minus, Square,
    Columns, AlignLeft, MousePointer2, UserCircle
} from 'lucide-react';

const ElementsPanel = ({ onAddElement }) => {

    const elementGroups = [
        {
            title: "Layout",
            items: [
                { label: "Container", icon: <Box size={18} />, tag: 'div', className: 'container custom-container', html: '<div class="p-4 border border-dashed border-gray-300 min-h-[100px]">Container</div>' },
                { label: "Section", icon: <Layout size={18} />, tag: 'section', className: 'section', html: '<section class="py-8 px-4 bg-gray-50 min-h-[150px]"><h2>Section Title</h2><p>Section content...</p></section>' },
                { label: "2 Columns", icon: <Columns size={18} />, tag: 'div', className: 'grid-2', html: '<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="p-4 bg-gray-100">Col 1</div><div class="p-4 bg-gray-100">Col 2</div></div>' },
                { label: "3 Columns", icon: <Columns size={18} />, tag: 'div', className: 'grid-3', html: '<div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div class="p-4 bg-gray-100">Col 1</div><div class="p-4 bg-gray-100">Col 2</div><div class="p-4 bg-gray-100">Col 3</div></div>' },
                { label: "Divider", icon: <Minus size={18} />, tag: 'hr', className: 'my-8 border-t border-gray-300' },
                { label: "Spacer", icon: <Box size={18} />, tag: 'div', className: 'h-8', html: '<div style="height: 32px;"></div>' },
            ]
        },
        {
            title: "Typography",
            items: [
                { label: "Heading 1", icon: <Type size={18} />, tag: 'h1', text: 'Main Headline' },
                { label: "Heading 2", icon: <Type size={18} />, tag: 'h2', text: 'Subheading' },
                { label: "Heading 3", icon: <Type size={18} />, tag: 'h3', text: 'Section Header' },
                { label: "Paragraph", icon: <AlignLeft size={18} />, tag: 'p', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' },
                { label: "Blockquote", icon: <Square size={18} />, tag: 'blockquote', html: '<blockquote class="border-l-4 border-indigo-500 pl-4 italic my-4">"This is a pull quote to emphasize key points."</blockquote>' },
                { label: "Unordered List", icon: <AlignLeft size={18} />, tag: 'ul', html: '<ul class="list-disc pl-5 space-y-2"><li>List item one</li><li>List item two</li><li>List item three</li></ul>' },
                { label: "Ordered List", icon: <AlignLeft size={18} />, tag: 'ol', html: '<ol class="list-decimal pl-5 space-y-2"><li>First step</li><li>Second step</li><li>Third step</li></ol>' },
            ]
        },
        {
            title: "Media",
            items: [
                { label: "Image", icon: <ImageIcon size={18} />, tag: 'img', src: 'https://placehold.co/800x400' },
                { label: "Figure", icon: <ImageIcon size={18} />, tag: 'figure', html: '<figure class="my-6"><img src="https://placehold.co/800x400" alt="Placeholder" class="w-full rounded mx-auto" /><figcaption class="text-center text-sm text-gray-500 mt-2">Image caption goes here</figcaption></figure>' },
                { label: "Video", icon: <ImageIcon size={18} />, tag: 'video', html: '<div class="relative w-full" style="padding-bottom:56.25%;background:#1f2937;border-radius:8px;overflow:hidden" data-video-src=""><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:14px;flex-direction:column;gap:8px"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>Click &amp; paste video URL in Properties →</div></div>' },
            ]
        },
        {
            title: "Components",
            items: [
                { label: "Button", icon: <MousePointer2 size={18} />, tag: 'button', html: '<button class="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition">Call to Action</button>' },
                { label: "Link", icon: <LinkIcon size={18} />, tag: 'a', text: 'Read More Link', href: '#' },
                { label: "Table", icon: <Box size={18} />, tag: 'table', html: '<div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-300"><thead class="bg-gray-100"><tr><th class="border border-gray-300 p-2">Header 1</th><th class="border border-gray-300 p-2">Header 2</th></tr></thead><tbody><tr><td class="border border-gray-300 p-2">Data 1</td><td class="border border-gray-300 p-2">Data 2</td></tr><tr><td class="border border-gray-300 p-2">Data 3</td><td class="border border-gray-300 p-2">Data 4</td></tr></tbody></table></div>' },
                { label: "Author Profile", icon: <UserCircle size={18} />, tag: 'div', html: '<div class="flex items-center gap-4 p-4 border rounded-lg bg-gray-50 my-6 max-w-md"><img src="https://placehold.co/100x100" alt="Author" class="w-16 h-16 rounded-full object-cover" /><div><h4 class="font-bold text-lg m-0">Author Name</h4><p class="text-sm text-gray-600 m-0">Senior Editor</p></div></div>' },
            ]
        }
    ];

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-full">
            <div className="p-4 border-b border-slate-800">
                <h3 className="font-medium text-slate-200 flex items-center gap-2">
                    <Layout size={18} /> Add Elements
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {elementGroups.map((group, idx) => (
                    <div key={idx}>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">{group.title}</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {group.items.map((item, i) => (
                                <button
                                    key={i}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('application/x-visual-editor-element', JSON.stringify(item));
                                        e.dataTransfer.effectAllowed = 'copy';
                                    }}
                                    onClick={() => onAddElement(item)}
                                    className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition hover:border-indigo-500 group cursor-grab active:cursor-grabbing"
                                >
                                    <div className="text-slate-400 group-hover:text-indigo-400">
                                        {item.icon}
                                    </div>
                                    <span className="text-xs text-slate-300">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ElementsPanel;
