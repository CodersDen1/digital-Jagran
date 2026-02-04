import React from 'react';
import {
    Settings, Trash2, Type, Layout, Palette,
    Maximize, FileImage, Layers
} from 'lucide-react';

const PropertiesPanel = ({
    selectedElement,
    onUpdateStyle,
    onUpdateAttribute,
    onDelete
}) => {

    // Helper to get current style safely
    const getStyle = (prop) => selectedElement?.styles?.[prop] || '';

    return (
        <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-medium text-slate-200 flex items-center gap-2">
                    <Settings size={16} /> Properties
                </h3>
                {selectedElement && (
                    <button
                        onClick={onDelete}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded transition"
                        title="Delete Element"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {selectedElement ? (
                    <>
                        {/* Info Header */}
                        <div className="bg-slate-800 p-3 rounded-lg text-xs font-mono text-slate-300 border border-slate-700">
                            Tag: <span className="text-indigo-400 font-bold uppercase">{selectedElement.tagName}</span>
                        </div>

                        {/* Image Specific */}
                        {selectedElement.tagName === 'img' && (
                            <div className="space-y-3 pb-4 border-b border-slate-800">
                                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                    <FileImage size={12} /> Image Source
                                </label>
                                <input
                                    type="text"
                                    value={selectedElement.src || ''}
                                    placeholder="https://"
                                    className="w-full h-8 bg-slate-800 rounded border border-slate-700 px-2 text-sm text-blue-400 focus:border-indigo-500 outline-none"
                                    onChange={(e) => onUpdateAttribute('src', e.target.value)}
                                />
                            </div>
                        )}

                        {/* Link Specific */}
                        {selectedElement.tagName === 'a' && (
                            <div className="space-y-3 pb-4 border-b border-slate-800">
                                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                    <FileImage size={12} /> Href Link
                                </label>
                                <input
                                    type="text"
                                    value={selectedElement.href || ''}
                                    placeholder="https://"
                                    className="w-full h-8 bg-slate-800 rounded border border-slate-700 px-2 text-sm text-blue-400 focus:border-indigo-500 outline-none"
                                    onChange={(e) => onUpdateAttribute('href', e.target.value)}
                                />
                            </div>
                        )}

                        {/* Dimensions & Display */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                <Maximize size={12} /> Dimensions
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[10px] text-slate-400 mb-1 block">Width</span>
                                    <input type="text" placeholder="auto" defaultValue={getStyle('width')}
                                        onChange={(e) => onUpdateStyle('width', e.target.value)}
                                        className="w-full h-7 bg-slate-800 rounded border border-slate-700 px-2 text-xs" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 mb-1 block">Height</span>
                                    <input type="text" placeholder="auto" defaultValue={getStyle('height')}
                                        onChange={(e) => onUpdateStyle('height', e.target.value)}
                                        className="w-full h-7 bg-slate-800 rounded border border-slate-700 px-2 text-xs" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 mb-1 block">Display</span>
                                    <select defaultValue={getStyle('display')}
                                        onChange={(e) => onUpdateStyle('display', e.target.value)}
                                        className="w-full h-7 bg-slate-800 rounded border border-slate-700 px-1 text-xs text-white">
                                        <option value="block">Block</option>
                                        <option value="inline-block">Inline Block</option>
                                        <option value="flex">Flex</option>
                                        <option value="grid">Grid</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 mb-1 block">Float</span>
                                    <select defaultValue={getStyle('float')}
                                        onChange={(e) => onUpdateStyle('float', e.target.value)}
                                        className="w-full h-7 bg-slate-800 rounded border border-slate-700 px-1 text-xs text-white">
                                        <option value="none">None</option>
                                        <option value="left">Left</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Typography */}
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                <Type size={12} /> Typography
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                    <span className="text-[10px] text-slate-400 mb-1 block">Font Family</span>
                                    <select defaultValue={getStyle('fontFamily')}
                                        onChange={(e) => onUpdateStyle('fontFamily', e.target.value)}
                                        className="w-full h-7 bg-slate-800 rounded border border-slate-700 px-1 text-xs text-white">
                                        <option value="inherit">Inherit</option>
                                        <option value="sans-serif">Sans Serif</option>
                                        <option value="serif">Serif</option>
                                        <option value="monospace">Monospace</option>
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 mb-1 block">Size</span>
                                    <input type="text" placeholder="16px" defaultValue={getStyle('fontSize')}
                                        onChange={(e) => onUpdateStyle('fontSize', e.target.value)}
                                        className="w-full h-7 bg-slate-800 rounded border border-slate-700 px-2 text-xs" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 mb-1 block">Color</span>
                                    <div className="flex bg-slate-800 rounded border border-slate-700 h-7 overflow-hidden">
                                        <input type="color" defaultValue={rgbToHex(getStyle('color'))}
                                            onChange={(e) => onUpdateStyle('color', e.target.value)}
                                            className="w-8 h-8 -m-0.5 cursor-pointer" />
                                        <input type="text" defaultValue={getStyle('color')}
                                            onChange={(e) => onUpdateStyle('color', e.target.value)}
                                            className="flex-1 bg-transparent px-2 text-xs outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 mb-1 block">Weight</span>
                                    <select defaultValue={getStyle('fontWeight')}
                                        onChange={(e) => onUpdateStyle('fontWeight', e.target.value)}
                                        className="w-full h-7 bg-slate-800 rounded border border-slate-700 px-1 text-xs text-white">
                                        <option value="400">Normal</option>
                                        <option value="700">Bold</option>
                                        <option value="300">Light</option>
                                        <option value="900">Black</option>
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 mb-1 block">Align</span>
                                    <select defaultValue={getStyle('textAlign')}
                                        onChange={(e) => onUpdateStyle('textAlign', e.target.value)}
                                        className="w-full h-7 bg-slate-800 rounded border border-slate-700 px-1 text-xs text-white">
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                        <option value="justify">Justify</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Spacing */}
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                <Layout size={12} /> Spacing
                            </label>

                            {/* Margin */}
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-400">Margin</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="T"
                                        onChange={(e) => onUpdateStyle('marginTop', e.target.value)}
                                        className="h-6 bg-slate-800 border border-slate-700 rounded px-1 text-center text-xs" />
                                    <input type="text" placeholder="B"
                                        onChange={(e) => onUpdateStyle('marginBottom', e.target.value)}
                                        className="h-6 bg-slate-800 border border-slate-700 rounded px-1 text-center text-xs" />
                                    <input type="text" placeholder="L"
                                        onChange={(e) => onUpdateStyle('marginLeft', e.target.value)}
                                        className="h-6 bg-slate-800 border border-slate-700 rounded px-1 text-center text-xs" />
                                    <input type="text" placeholder="R"
                                        onChange={(e) => onUpdateStyle('marginRight', e.target.value)}
                                        className="h-6 bg-slate-800 border border-slate-700 rounded px-1 text-center text-xs" />
                                </div>
                            </div>

                            {/* Padding */}
                            <div className="space-y-1 mt-2">
                                <span className="text-[10px] text-slate-400">Padding</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="T"
                                        onChange={(e) => onUpdateStyle('paddingTop', e.target.value)}
                                        className="h-6 bg-slate-800 border border-slate-700 rounded px-1 text-center text-xs" />
                                    <input type="text" placeholder="B"
                                        onChange={(e) => onUpdateStyle('paddingBottom', e.target.value)}
                                        className="h-6 bg-slate-800 border border-slate-700 rounded px-1 text-center text-xs" />
                                    <input type="text" placeholder="L"
                                        onChange={(e) => onUpdateStyle('paddingLeft', e.target.value)}
                                        className="h-6 bg-slate-800 border border-slate-700 rounded px-1 text-center text-xs" />
                                    <input type="text" placeholder="R"
                                        onChange={(e) => onUpdateStyle('paddingRight', e.target.value)}
                                        className="h-6 bg-slate-800 border border-slate-700 rounded px-1 text-center text-xs" />
                                </div>
                            </div>
                        </div>

                        {/* Background & Effects */}
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                <Palette size={12} /> Background
                            </label>
                            <div>
                                <span className="text-[10px] text-slate-400 mb-1 block">Fill Color</span>
                                <div className="flex bg-slate-800 rounded border border-slate-700 h-7 overflow-hidden">
                                    <input type="color" defaultValue={rgbToHex(getStyle('backgroundColor'))}
                                        onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}
                                        className="w-8 h-8 -m-0.5 cursor-pointer" />
                                    <input type="text" defaultValue={getStyle('backgroundColor')}
                                        onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}
                                        className="flex-1 bg-transparent px-2 text-xs outline-none" />
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 mb-1 block">Opacity</span>
                                <input type="range" min="0" max="1" step="0.1" defaultValue={getStyle('opacity') || 1}
                                    onChange={(e) => onUpdateStyle('opacity', e.target.value)}
                                    className="w-full" />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 mb-1 block">Border Radius</span>
                                <input type="text" placeholder="0px" defaultValue={getStyle('borderRadius')}
                                    onChange={(e) => onUpdateStyle('borderRadius', e.target.value)}
                                    className="w-full h-7 bg-slate-800 rounded border border-slate-700 px-2 text-xs" />
                            </div>
                        </div>

                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center px-4">
                        <Layers size={32} className="mb-3 opacity-30" />
                        <span className="text-sm font-medium">No Selection</span>
                        <p className="text-xs text-slate-600 mt-1">Click any element on the canvas to edit its properties.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper to convert RGB to Hex for input[type=color]
function rgbToHex(rgb) {
    if (!rgb) return '#ffffff';
    if (rgb.startsWith('#')) return rgb;
    // Basic rgb(r, g, b) handler
    const sep = rgb.indexOf(",") > -1 ? "," : " ";
    const parts = rgb.substr(4).split(")")[0].split(sep);
    if (parts.length < 3) return '#ffffff';

    let r = (+parts[0]).toString(16),
        g = (+parts[1]).toString(16),
        b = (+parts[2]).toString(16);

    if (r.length == 1) r = "0" + r;
    if (g.length == 1) g = "0" + g;
    if (b.length == 1) b = "0" + b;

    return "#" + r + g + b;
}

export default PropertiesPanel;
