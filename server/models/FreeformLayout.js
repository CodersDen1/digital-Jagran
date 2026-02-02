const mongoose = require('mongoose');

/**
 * Freeform Element Schema
 * Defines individual elements with absolute positioning for freeform canvas
 */
const freeformElementSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['header', 'summary', 'body', 'image', 'video', 'author', 'date', 'tags', 'text', 'divider', 'spacer', 'shape', 'container', 'group']
    },

    // Absolute positioning (pixels) - optional for group elements
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 200 },
    height: { type: Number, default: 100 },

    // Layering and transform
    zIndex: { type: Number, default: 1 },
    rotation: { type: Number, default: 0 }, // Degrees
    opacity: { type: Number, default: 100, min: 0, max: 100 }, // Percentage

    // State
    locked: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    groupId: { type: String, default: null }, // For grouping elements

    // Element configuration
    config: {
        // Typography
        fontSize: { type: String, default: 'base' },
        fontWeight: { type: String, default: 'normal' },
        fontFamily: { type: String, default: 'sans' },
        textAlign: { type: String, default: 'left' },
        textColor: { type: String, default: '#1f2937' },
        lineHeight: { type: String, default: 'normal' },

        // Background and border
        backgroundColor: { type: String, default: 'transparent' },
        borderRadius: { type: Number, default: 0 }, // Pixels
        borderWidth: { type: Number, default: 0 },
        borderColor: { type: String, default: '#e5e7eb' },
        borderStyle: { type: String, default: 'solid' },

        // Shadow
        shadowEnabled: { type: Boolean, default: false },
        shadowX: { type: Number, default: 0 },
        shadowY: { type: Number, default: 4 },
        shadowBlur: { type: Number, default: 8 },
        shadowColor: { type: String, default: 'rgba(0,0,0,0.1)' },

        // Image specific
        aspectRatio: { type: String, default: 'auto' },
        objectFit: { type: String, default: 'cover' },
        imageUrl: { type: String, default: '' },

        // Video specific
        videoUrl: { type: String, default: '' },
        autoplay: { type: Boolean, default: false },

        // Shape specific
        shapeType: { type: String, default: 'rectangle' }, // rectangle, circle, triangle, line
        fillColor: { type: String, default: '#4f46e5' },
        strokeColor: { type: String, default: '#4f46e5' },
        strokeWidth: { type: Number, default: 0 },

        // Content specific
        tag: { type: String, default: 'h1' }, // For headers
        customContent: { type: String, default: '' },

        // Padding
        paddingTop: { type: Number, default: 0 },
        paddingBottom: { type: Number, default: 0 },
        paddingLeft: { type: Number, default: 0 },
        paddingRight: { type: Number, default: 0 }
    }
}, { _id: false });

/**
 * Freeform Layout Schema
 * Stores freeform canvas layout configurations
 */
const freeformLayoutSchema = new mongoose.Schema({
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

    // Canvas settings
    canvas: {
        width: { type: Number, default: 1200 }, // Default canvas width
        height: { type: Number, default: 1800 }, // Default canvas height
        backgroundColor: { type: String, default: '#ffffff' },
        showGrid: { type: Boolean, default: true },
        gridSize: { type: Number, default: 20 }, // Grid cell size in pixels
        snapToGrid: { type: Boolean, default: false },
        snapToElements: { type: Boolean, default: true }
    },

    // Layout elements
    elements: [freeformElementSchema],

    // Groups for element grouping
    groups: [{
        id: { type: String, required: true },
        name: { type: String, default: 'Group' },
        elementIds: [{ type: String }]
    }],

    // Viewport settings (for restoring zoom/pan state)
    viewport: {
        zoom: { type: Number, default: 1 },
        panX: { type: Number, default: 0 },
        panY: { type: Number, default: 0 }
    },

    // Theme settings
    theme: {
        primaryColor: { type: String, default: '#4f46e5' },
        secondaryColor: { type: String, default: '#10b981' },
        textColor: { type: String, default: '#1f2937' },
        backgroundColor: { type: String, default: '#ffffff' }
    },

    // Metadata
    createdBy: { type: String, default: 'system' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware to update timestamp and ensure only one default layout exists
freeformLayoutSchema.pre('save', async function () {
    this.updatedAt = new Date();

    if (this.isDefault) {
        await this.constructor.updateMany(
            { _id: { $ne: this._id }, isDefault: true },
            { isDefault: false }
        );
    }
});

// Static method to get default layout
freeformLayoutSchema.statics.getDefault = function () {
    return this.findOne({ isDefault: true, isActive: true });
};

// Create indexes
freeformLayoutSchema.index({ name: 1 });
freeformLayoutSchema.index({ isDefault: 1 });
freeformLayoutSchema.index({ isActive: 1 });
freeformLayoutSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FreeformLayout', freeformLayoutSchema);
