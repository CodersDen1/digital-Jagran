const mongoose = require('mongoose');

/**
 * Layout Element Schema
 * Defines individual elements that can be placed in a layout
 */
const layoutElementSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['header', 'summary', 'body', 'image', 'video', 'author', 'date', 'tags', 'text', 'divider', 'spacer', 'section']
    },
    // Grid positioning (12-column grid system)
    row: { type: Number, required: true, default: 0 },
    column: { type: Number, required: true, default: 0, min: 0, max: 11 },
    width: { type: Number, required: true, default: 12, min: 1, max: 12 }, // Column span
    order: { type: Number, default: 0 }, // Display order within same row
    parentId: { type: String, default: null }, // ID of parent section (if any)

    // Element configuration
    config: {
        // Section/Grid specific
        columns: { type: Number, default: 2 },
        ratio: { type: String, default: 'equal' },

        // Typography
        fontSize: { type: String, default: 'base' }, // 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'
        fontWeight: { type: String, default: 'normal' }, // 'light', 'normal', 'medium', 'semibold', 'bold'
        fontFamily: { type: String, default: 'serif' }, // 'serif', 'sans'
        textAlign: { type: String, default: 'left' }, // 'left', 'center', 'right', 'justify'
        textColor: { type: String, default: 'gray-900' },
        lineHeight: { type: String, default: 'normal' }, // 'tight', 'normal', 'relaxed', 'loose'

        // Spacing
        paddingTop: { type: String, default: '0' },
        paddingBottom: { type: String, default: '0' },
        paddingLeft: { type: String, default: '0' },
        paddingRight: { type: String, default: '0' },
        marginTop: { type: String, default: '0' },
        marginBottom: { type: String, default: '4' },

        // Background and border
        backgroundColor: { type: String, default: 'transparent' },
        borderRadius: { type: String, default: 'none' }, // 'none', 'sm', 'md', 'lg', 'xl', 'full'
        borderWidth: { type: String, default: '0' },
        borderColor: { type: String, default: 'gray-200' },

        // Image specific
        aspectRatio: { type: String, default: '16/9' }, // '1/1', '4/3', '16/9', '21/9', 'auto'
        objectFit: { type: String, default: 'cover' }, // 'cover', 'contain', 'fill', 'none'
        maxHeight: { type: String, default: '' }, // '', '24', '32', etc.

        // Content specific
        tag: { type: String, default: '' }, // For headers: h1, h2, etc.

        // Custom content (for text type)
        customContent: { type: String, default: '' },

        // Visibility
        showOnMobile: { type: Boolean, default: true },
        showOnDesktop: { type: Boolean, default: true }
    }
}, { _id: false });

/**
 * Layout Template Schema
 * Stores reusable page layout configurations
 */
const layoutTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },

    // Layout configuration
    elements: [layoutElementSchema],

    // Grid settings
    gridGap: { type: String, default: '4' }, // Gap between grid items (Tailwind spacing scale)
    maxWidth: { type: String, default: '4xl' }, // 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full'
    containerPadding: { type: String, default: '4' },

    // Theme settings
    theme: {
        backgroundColor: { type: String, default: 'white' },
        textColor: { type: String, default: 'gray-900' },
        accentColor: { type: String, default: 'brand-red' }
    },

    // Metadata
    createdBy: { type: String, default: 'system' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware to update timestamp and ensure only one default layout exists
layoutTemplateSchema.pre('save', async function () {
    // Update timestamp
    this.updatedAt = new Date();

    // Ensure only one default layout exists
    if (this.isDefault) {
        await this.constructor.updateMany(
            { _id: { $ne: this._id }, isDefault: true },
            { isDefault: false }
        );
    }
});

// Static method to get default layout
layoutTemplateSchema.statics.getDefault = function () {
    return this.findOne({ isDefault: true, isActive: true });
};

// Create indexes
layoutTemplateSchema.index({ name: 1 });
layoutTemplateSchema.index({ isDefault: 1 });
layoutTemplateSchema.index({ isActive: 1 });

module.exports = mongoose.model('LayoutTemplate', layoutTemplateSchema);
