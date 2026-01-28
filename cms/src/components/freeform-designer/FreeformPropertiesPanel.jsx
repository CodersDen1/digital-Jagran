import React, { useState } from 'react';
import {
    X,
    Trash2,
    Copy,
    ChevronUp,
    ChevronDown,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    RotateCw,
    Palette,
    Type,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    MoveVertical,
    Bold,
    Italic
} from 'lucide-react';

/**
 * FreeformPropertiesPanel - Right sidebar for editing selected element properties
 */
const FreeformPropertiesPanel = ({
    selectedElements,
    onUpdateElement,
    onUpdateConfig,
    onDelete,
    onDuplicate,
    onBringForward,
    onSendBackward,
    onClose,
    editorMode = 'layout',
    articleData = {},
    onContentChange
}) => {
    const [activeSection, setActiveSection] = useState('position');

    // If multiple elements selected, show limited options
    const isMultiple = selectedElements.length > 1;
    const element = selectedElements[0];

    if (!element) return null;

    const handleUpdateElement = (field, value) => {
        selectedElements.forEach(el => {
            onUpdateElement(el.id, { [field]: value });
        });
    };

    const handleUpdateConfig = (field, value) => {
        onUpdateConfig(element.id, { [field]: value });
    };

    return (
        <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white capitalize">
                        {isMultiple ? `${selectedElements.length} Elements` : element.type}
                    </span>
                    {element.locked && <Lock size={12} className="text-amber-400" />}
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleUpdateElement('locked', !element.locked)}
                        className={`p-1.5 rounded transition ${element.locked
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                        title={element.locked ? 'Unlock' : 'Lock'}
                    >
                        {element.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                    <button
                        onClick={() => handleUpdateElement('visible', !element.visible)}
                        className={`p-1.5 rounded transition ${!element.visible
                            ? 'bg-slate-600 text-slate-400'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                        title={element.visible ? 'Hide' : 'Show'}
                    >
                        {element.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onSendBackward}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
                        title="Send Backward (Cmd+[)"
                    >
                        <ChevronDown size={14} />
                    </button>
                    <button
                        onClick={onBringForward}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
                        title="Bring Forward (Cmd+])"
                    >
                        <ChevronUp size={14} />
                    </button>
                    <div className="w-px h-4 bg-slate-600 mx-1"></div>
                    <button
                        onClick={onDuplicate}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
                        title="Duplicate (Cmd+D)"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Properties Sections */}
            <div className="flex-1 overflow-y-auto">
                {/* Position & Size */}
                <div className="border-b border-slate-700">
                    <SectionHeader
                        title="Position & Size"
                        active={activeSection === 'position'}
                        onClick={() => setActiveSection(activeSection === 'position' ? '' : 'position')}
                    />
                    {activeSection === 'position' && (
                        <div className="px-4 py-3 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <InputField
                                    label="X"
                                    value={Math.round(element.x)}
                                    onChange={(v) => handleUpdateElement('x', v)}
                                    suffix="px"
                                />
                                <InputField
                                    label="Y"
                                    value={Math.round(element.y)}
                                    onChange={(v) => handleUpdateElement('y', v)}
                                    suffix="px"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <InputField
                                    label="Width"
                                    value={Math.round(element.width)}
                                    onChange={(v) => handleUpdateElement('width', v)}
                                    min={20}
                                    suffix="px"
                                />
                                <InputField
                                    label="Height"
                                    value={Math.round(element.height)}
                                    onChange={(v) => handleUpdateElement('height', v)}
                                    min={20}
                                    suffix="px"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <InputField
                                    label="Rotation"
                                    value={element.rotation || 0}
                                    onChange={(v) => handleUpdateElement('rotation', v)}
                                    min={-360}
                                    max={360}
                                    suffix="°"
                                />
                                <InputField
                                    label="Opacity"
                                    value={element.opacity}
                                    onChange={(v) => handleUpdateElement('opacity', v)}
                                    min={0}
                                    max={100}
                                    suffix="%"
                                />
                            </div>
                            <InputField
                                label="Z-Index"
                                value={element.zIndex}
                                onChange={(v) => handleUpdateElement('zIndex', v)}
                                min={1}
                            />
                        </div>
                    )}
                </div>

                {/* Typography (for text elements) */}
                {['header', 'summary', 'body', 'text', 'author', 'date'].includes(element.type) && (
                    <div className="border-b border-slate-700">
                        <SectionHeader
                            title="Typography"
                            active={activeSection === 'typography'}
                            onClick={() => setActiveSection(activeSection === 'typography' ? '' : 'typography')}
                        />
                        {activeSection === 'typography' && (
                            <div className="px-4 py-3 space-y-3">
                                <SelectField
                                    label="Font Size"
                                    value={element.config?.fontSize || 'base'}
                                    onChange={(v) => handleUpdateConfig('fontSize', v)}
                                    options={[
                                        { value: 'xs', label: 'XS' },
                                        { value: 'sm', label: 'SM' },
                                        { value: 'base', label: 'Base' },
                                        { value: 'lg', label: 'LG' },
                                        { value: 'xl', label: 'XL' },
                                        { value: '2xl', label: '2XL' },
                                        { value: '3xl', label: '3XL' },
                                        { value: '4xl', label: '4XL' },
                                        { value: '5xl', label: '5XL' },
                                    ]}
                                />
                                <SelectField
                                    label="Font Weight"
                                    value={element.config?.fontWeight || 'normal'}
                                    onChange={(v) => handleUpdateConfig('fontWeight', v)}
                                    options={[
                                        { value: 'light', label: 'Light' },
                                        { value: 'normal', label: 'Normal' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'semibold', label: 'Semibold' },
                                        { value: 'bold', label: 'Bold' },
                                    ]}
                                />
                                <SelectField
                                    label="Font Family"
                                    value={element.config?.fontFamily || 'sans'}
                                    onChange={(v) => handleUpdateConfig('fontFamily', v)}
                                    options={[
                                        { value: 'sans', label: 'Sans Serif' },
                                        { value: 'serif', label: 'Serif' },
                                        { value: 'mono', label: 'Monospace' },
                                    ]}
                                />
                                <ColorField
                                    label="Text Color"
                                    value={element.config?.textColor}
                                    onChange={(v) => handleUpdateConfig('textColor', v)}
                                />
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400">Align</label>
                                    <div className="flex items-center gap-1 bg-slate-700 rounded p-1">
                                        {[
                                            { value: 'left', icon: AlignLeft },
                                            { value: 'center', icon: AlignCenter },
                                            { value: 'right', icon: AlignRight },
                                            { value: 'justify', icon: AlignJustify },
                                        ].map(({ value, icon: Icon }) => (
                                            <button
                                                key={value}
                                                onClick={() => handleUpdateConfig('textAlign', value)}
                                                className={`p-1.5 rounded transition ${element.config?.textAlign === value
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-slate-400 hover:text-white'
                                                    }`}
                                            >
                                                <Icon size={12} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <SelectField
                                    label="Line Height"
                                    value={element.config?.lineHeight || 'normal'}
                                    onChange={(v) => handleUpdateConfig('lineHeight', v)}
                                    options={[
                                        { value: 'tight', label: 'Tight' },
                                        { value: 'normal', label: 'Normal' },
                                        { value: 'relaxed', label: 'Relaxed' },
                                        { value: 'loose', label: 'Loose' },
                                    ]}
                                />
                                {element.type === 'header' && (
                                    <SelectField
                                        label="Tag"
                                        value={element.config?.tag || 'h1'}
                                        onChange={(v) => handleUpdateConfig('tag', v)}
                                        options={[
                                            { value: 'h1', label: 'H1' },
                                            { value: 'h2', label: 'H2' },
                                            { value: 'h3', label: 'H3' },
                                            { value: 'h4', label: 'H4' },
                                            { value: 'h5', label: 'H5' },
                                        ]}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Background & Border */}
                <div className="border-b border-slate-700">
                    <SectionHeader
                        title="Fill & Border"
                        active={activeSection === 'fill'}
                        onClick={() => setActiveSection(activeSection === 'fill' ? '' : 'fill')}
                    />
                    {activeSection === 'fill' && (
                        <div className="px-4 py-3 space-y-3">
                            <ColorField
                                label="Background"
                                value={element.config?.backgroundColor}
                                onChange={(v) => handleUpdateConfig('backgroundColor', v)}
                            />
                            <InputField
                                label="Border Radius"
                                value={element.config?.borderRadius || 0}
                                onChange={(v) => handleUpdateConfig('borderRadius', v)}
                                min={0}
                                suffix="px"
                            />
                            <InputField
                                label="Border Width"
                                value={element.config?.borderWidth || 0}
                                onChange={(v) => handleUpdateConfig('borderWidth', v)}
                                min={0}
                                suffix="px"
                            />
                            <ColorField
                                label="Border Color"
                                value={element.config?.borderColor}
                                onChange={(v) => handleUpdateConfig('borderColor', v)}
                            />
                        </div>
                    )}
                </div>

                {/* Image Settings */}
                {element.type === 'image' && (
                    <div className="border-b border-slate-700">
                        <SectionHeader
                            title="Image Settings"
                            active={activeSection === 'image'}
                            onClick={() => setActiveSection(activeSection === 'image' ? '' : 'image')}
                        />
                        {activeSection === 'image' && (
                            <div className="px-4 py-3 space-y-3">
                                {/* Image URL input - only in article mode */}
                                {editorMode === 'article' && (
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">Image URL</label>
                                        <input
                                            type="text"
                                            value={articleData[element.id] || ''}
                                            onChange={(e) => onContentChange(element.id, e.target.value)}
                                            placeholder="Paste image URL here..."
                                            className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                        />
                                        {articleData[element.id] && (
                                            <div className="mt-2 rounded overflow-hidden">
                                                <img
                                                    src={articleData[element.id]}
                                                    alt="Preview"
                                                    className="w-full h-24 object-cover"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <SelectField
                                    label="Object Fit"
                                    value={element.config?.objectFit || 'cover'}
                                    onChange={(v) => handleUpdateConfig('objectFit', v)}
                                    options={[
                                        { value: 'cover', label: 'Cover' },
                                        { value: 'contain', label: 'Contain' },
                                        { value: 'fill', label: 'Fill' },
                                        { value: 'none', label: 'None' },
                                    ]}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Video Settings */}
                {element.type === 'video' && (
                    <div className="border-b border-slate-700">
                        <SectionHeader
                            title="Video Settings"
                            active={activeSection === 'video'}
                            onClick={() => setActiveSection(activeSection === 'video' ? '' : 'video')}
                        />
                        {activeSection === 'video' && (
                            <div className="px-4 py-3 space-y-3">
                                {/* Video URL input - only in article mode */}
                                {editorMode === 'article' && (
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">Video URL (YouTube)</label>
                                        <input
                                            type="text"
                                            value={articleData[element.id] || ''}
                                            onChange={(e) => onContentChange(element.id, e.target.value)}
                                            placeholder="https://youtube.com/watch?v=..."
                                            className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Custom Text Content */}
                {element.type === 'text' && (
                    <div className="border-b border-slate-700">
                        <SectionHeader
                            title="Content"
                            active={activeSection === 'content'}
                            onClick={() => setActiveSection(activeSection === 'content' ? '' : 'content')}
                        />
                        {activeSection === 'content' && (
                            <div className="px-4 py-3">
                                <textarea
                                    value={element.config?.customContent || ''}
                                    onChange={(e) => handleUpdateConfig('customContent', e.target.value)}
                                    placeholder="Enter custom text..."
                                    rows={4}
                                    className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Shape Settings */}
                {element.type === 'shape' && (
                    <div className="border-b border-slate-700">
                        <SectionHeader
                            title="Shape Settings"
                            active={activeSection === 'shape'}
                            onClick={() => setActiveSection(activeSection === 'shape' ? '' : 'shape')}
                        />
                        {activeSection === 'shape' && (
                            <div className="px-4 py-3 space-y-3">
                                <SelectField
                                    label="Shape Type"
                                    value={element.config?.shapeType || 'rectangle'}
                                    onChange={(v) => handleUpdateConfig('shapeType', v)}
                                    options={[
                                        { value: 'rectangle', label: 'Rectangle' },
                                        { value: 'circle', label: 'Circle' },
                                    ]}
                                />
                                <ColorField
                                    label="Fill Color"
                                    value={element.config?.fillColor}
                                    onChange={(v) => handleUpdateConfig('fillColor', v)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper Components - Defined outside to prevent re-mounting and focus loss
const SectionHeader = ({ title, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition ${active
            ? 'bg-slate-700 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
    >
        {title}
        {active ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
    </button>
);

const InputField = ({ label, value, onChange, type = 'number', min, max, step = 1, suffix = '' }) => (
    <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400">{label}</label>
        <div className="flex items-center gap-1">
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                min={min}
                max={max}
                step={step}
                className="w-16 px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-white focus:border-indigo-500 focus:outline-none"
            />
            {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
        </div>
    </div>
);

const ColorField = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400">{label}</label>
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                className="w-20 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white focus:border-indigo-500 focus:outline-none"
            />
        </div>
    </div>
);

const SelectField = ({ label, value, onChange, options }) => (
    <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-24 px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-white focus:border-indigo-500 focus:outline-none"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

export default FreeformPropertiesPanel;
