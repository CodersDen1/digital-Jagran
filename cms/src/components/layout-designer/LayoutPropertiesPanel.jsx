import React from 'react';
import { X, Trash2 } from 'lucide-react';

/**
 * Font size options
 */
const FONT_SIZES = [
    { value: 'xs', label: 'Extra Small' },
    { value: 'sm', label: 'Small' },
    { value: 'base', label: 'Base' },
    { value: 'lg', label: 'Large' },
    { value: 'xl', label: 'XL' },
    { value: '2xl', label: '2XL' },
    { value: '3xl', label: '3XL' },
    { value: '4xl', label: '4XL' },
    { value: '5xl', label: '5XL' },
];

/**
 * Font weight options
 */
const FONT_WEIGHTS = [
    { value: 'light', label: 'Light' },
    { value: 'normal', label: 'Normal' },
    { value: 'medium', label: 'Medium' },
    { value: 'semibold', label: 'Semibold' },
    { value: 'bold', label: 'Bold' },
];

/**
 * Font family options
 */
const FONT_FAMILIES = [
    { value: 'serif', label: 'Serif (Merriweather)' },
    { value: 'sans', label: 'Sans (Inter)' },
];

/**
 * Text alignment options
 */
const TEXT_ALIGNS = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
    { value: 'justify', label: 'Justify' },
];

/**
 * Line height options
 */
const LINE_HEIGHTS = [
    { value: 'tight', label: 'Tight' },
    { value: 'normal', label: 'Normal' },
    { value: 'relaxed', label: 'Relaxed' },
    { value: 'loose', label: 'Loose' },
];

/**
 * Spacing options
 */
const SPACING_OPTIONS = [
    { value: '0', label: '0' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '6', label: '6' },
    { value: '8', label: '8' },
    { value: '10', label: '10' },
    { value: '12', label: '12' },
    { value: '16', label: '16' },
];

/**
 * Width options (columns)
 */
const WIDTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1} col${i > 0 ? 's' : ''}`
}));

/**
 * Aspect ratio options
 */
const ASPECT_RATIOS = [
    { value: '1/1', label: 'Square (1:1)' },
    { value: '4/3', label: 'Standard (4:3)' },
    { value: '16/9', label: 'Wide (16:9)' },
    { value: '21/9', label: 'Ultra Wide (21:9)' },
    { value: 'auto', label: 'Auto' },
];

/**
 * Border radius options
 */
const BORDER_RADIUS = [
    { value: 'none', label: 'None' },
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
    { value: 'xl', label: 'Extra Large' },
    { value: 'full', label: 'Full' },
];

/**
 * Text color options
 */
const TEXT_COLORS = [
    { value: 'gray-900', label: 'Default (Dark)' },
    { value: 'gray-700', label: 'Gray' },
    { value: 'gray-600', label: 'Medium Gray' },
    { value: 'gray-500', label: 'Light Gray' },
    { value: 'brand-red', label: 'Brand Red' },
    { value: 'white', label: 'White' },
];

/**
 * SelectField component
 */
const SelectField = ({ label, value, onChange, options }) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

/**
 * LayoutPropertiesPanel - Right sidebar for editing element properties
 */
const LayoutPropertiesPanel = ({
    element,
    onUpdateConfig,
    onUpdateElement,
    onDelete,
    onClose
}) => {
    const { type, config, width } = element;

    // Determine which properties to show based on element type
    const showTypography = ['header', 'summary', 'body', 'author', 'date', 'tags', 'text'].includes(type);
    const showImageOptions = ['image'].includes(type);
    const showVideoOptions = ['video'].includes(type);
    const showCustomContent = ['text'].includes(type);
    const showSpacing = true; // All elements have spacing

    return (
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Properties</h3>
                <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* Element Type (read-only) */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Element Type</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-medium capitalize">
                        {type}
                    </div>
                </div>

                {/* Width */}
                <SelectField
                    label="Width (columns)"
                    value={width}
                    onChange={(val) => onUpdateElement({ width: parseInt(val) })}
                    options={WIDTH_OPTIONS}
                />

                {/* Typography Section */}
                {showTypography && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Typography
                        </h4>

                        <SelectField
                            label="Font Size"
                            value={config.fontSize}
                            onChange={(val) => onUpdateConfig({ fontSize: val })}
                            options={FONT_SIZES}
                        />

                        <SelectField
                            label="Font Weight"
                            value={config.fontWeight}
                            onChange={(val) => onUpdateConfig({ fontWeight: val })}
                            options={FONT_WEIGHTS}
                        />

                        <SelectField
                            label="Font Family"
                            value={config.fontFamily}
                            onChange={(val) => onUpdateConfig({ fontFamily: val })}
                            options={FONT_FAMILIES}
                        />

                        <SelectField
                            label="Text Align"
                            value={config.textAlign}
                            onChange={(val) => onUpdateConfig({ textAlign: val })}
                            options={TEXT_ALIGNS}
                        />

                        <SelectField
                            label="Text Color"
                            value={config.textColor}
                            onChange={(val) => onUpdateConfig({ textColor: val })}
                            options={TEXT_COLORS}
                        />

                        <SelectField
                            label="Line Height"
                            value={config.lineHeight}
                            onChange={(val) => onUpdateConfig({ lineHeight: val })}
                            options={LINE_HEIGHTS}
                        />
                    </div>
                )}

                {/* Image Options */}
                {showImageOptions && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Image Options
                        </h4>

                        <SelectField
                            label="Aspect Ratio"
                            value={config.aspectRatio}
                            onChange={(val) => onUpdateConfig({ aspectRatio: val })}
                            options={ASPECT_RATIOS}
                        />

                        <SelectField
                            label="Object Fit"
                            value={config.objectFit}
                            onChange={(val) => onUpdateConfig({ objectFit: val })}
                            options={[
                                { value: 'cover', label: 'Cover' },
                                { value: 'contain', label: 'Contain' },
                                { value: 'fill', label: 'Fill' },
                            ]}
                        />

                        <SelectField
                            label="Border Radius"
                            value={config.borderRadius}
                            onChange={(val) => onUpdateConfig({ borderRadius: val })}
                            options={BORDER_RADIUS}
                        />
                    </div>
                )}

                {/* Video Options */}
                {showVideoOptions && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Video Options
                        </h4>

                        <SelectField
                            label="Aspect Ratio"
                            value={config.aspectRatio}
                            onChange={(val) => onUpdateConfig({ aspectRatio: val })}
                            options={ASPECT_RATIOS}
                        />
                    </div>
                )}

                {/* Custom Content */}
                {showCustomContent && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Content
                        </h4>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Custom Text</label>
                            <textarea
                                value={config.customContent || ''}
                                onChange={(e) => onUpdateConfig({ customContent: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="Enter custom text content..."
                            />
                        </div>
                    </div>
                )}

                {/* Spacing Section */}
                {showSpacing && (
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Spacing
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                            <SelectField
                                label="Margin Top"
                                value={config.marginTop}
                                onChange={(val) => onUpdateConfig({ marginTop: val })}
                                options={SPACING_OPTIONS}
                            />
                            <SelectField
                                label="Margin Bottom"
                                value={config.marginBottom}
                                onChange={(val) => onUpdateConfig({ marginBottom: val })}
                                options={SPACING_OPTIONS}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <SelectField
                                label="Padding Top"
                                value={config.paddingTop}
                                onChange={(val) => onUpdateConfig({ paddingTop: val })}
                                options={SPACING_OPTIONS}
                            />
                            <SelectField
                                label="Padding Bottom"
                                value={config.paddingBottom}
                                onChange={(val) => onUpdateConfig({ paddingBottom: val })}
                                options={SPACING_OPTIONS}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <SelectField
                                label="Padding Left"
                                value={config.paddingLeft}
                                onChange={(val) => onUpdateConfig({ paddingLeft: val })}
                                options={SPACING_OPTIONS}
                            />
                            <SelectField
                                label="Padding Right"
                                value={config.paddingRight}
                                onChange={(val) => onUpdateConfig({ paddingRight: val })}
                                options={SPACING_OPTIONS}
                            />
                        </div>
                    </div>
                )}

                {/* Delete Button */}
                <div className="pt-4 border-t border-gray-200">
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this element?')) {
                                onDelete();
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition"
                    >
                        <Trash2 size={18} />
                        <span>Delete Element</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LayoutPropertiesPanel;
