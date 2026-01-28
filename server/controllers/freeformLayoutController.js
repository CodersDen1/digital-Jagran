const FreeformLayout = require('../models/FreeformLayout');

/**
 * Freeform Layout Controller
 * Handles CRUD operations for freeform canvas layouts
 */

// Create a new freeform layout
exports.createFreeformLayout = async (req, res) => {
    try {
        const layoutData = {
            name: req.body.name || 'Untitled Layout',
            description: req.body.description || '',
            canvas: req.body.canvas || {},
            elements: req.body.elements || [],
            groups: req.body.groups || [],
            viewport: req.body.viewport || {},
            theme: req.body.theme || {}
        };

        const layout = new FreeformLayout(layoutData);
        await layout.save();

        res.status(201).json(layout);
    } catch (error) {
        console.error('Error creating freeform layout:', error);
        res.status(500).json({ error: 'Failed to create freeform layout', details: error.message });
    }
};

// Get all freeform layouts
exports.getAllFreeformLayouts = async (req, res) => {
    try {
        const layouts = await FreeformLayout.find({ isActive: true })
            .select('name description isDefault canvas.width canvas.height elements createdAt updatedAt')
            .sort({ updatedAt: -1 });

        // Add element count for display
        const layoutsWithMeta = layouts.map(layout => ({
            ...layout.toObject(),
            elementCount: layout.elements?.length || 0
        }));

        res.json(layoutsWithMeta);
    } catch (error) {
        console.error('Error fetching freeform layouts:', error);
        res.status(500).json({ error: 'Failed to fetch freeform layouts', details: error.message });
    }
};

// Get a freeform layout by ID
exports.getFreeformLayoutById = async (req, res) => {
    try {
        const layout = await FreeformLayout.findById(req.params.id);

        if (!layout) {
            return res.status(404).json({ error: 'Freeform layout not found' });
        }

        res.json(layout);
    } catch (error) {
        console.error('Error fetching freeform layout:', error);
        res.status(500).json({ error: 'Failed to fetch freeform layout', details: error.message });
    }
};

// Get the default freeform layout
exports.getDefaultFreeformLayout = async (req, res) => {
    try {
        let layout = await FreeformLayout.getDefault();

        if (!layout) {
            // Return first active layout if no default is set
            layout = await FreeformLayout.findOne({ isActive: true });
        }

        if (!layout) {
            return res.status(404).json({ error: 'No freeform layout found' });
        }

        res.json(layout);
    } catch (error) {
        console.error('Error fetching default freeform layout:', error);
        res.status(500).json({ error: 'Failed to fetch default freeform layout', details: error.message });
    }
};

// Update a freeform layout
exports.updateFreeformLayout = async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };

        const layout = await FreeformLayout.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!layout) {
            return res.status(404).json({ error: 'Freeform layout not found' });
        }

        res.json(layout);
    } catch (error) {
        console.error('Error updating freeform layout:', error);
        res.status(500).json({ error: 'Failed to update freeform layout', details: error.message });
    }
};

// Delete a freeform layout
exports.deleteFreeformLayout = async (req, res) => {
    try {
        const layout = await FreeformLayout.findById(req.params.id);

        if (!layout) {
            return res.status(404).json({ error: 'Freeform layout not found' });
        }

        await FreeformLayout.findByIdAndDelete(req.params.id);
        res.json({ message: 'Freeform layout deleted successfully' });
    } catch (error) {
        console.error('Error deleting freeform layout:', error);
        res.status(500).json({ error: 'Failed to delete freeform layout', details: error.message });
    }
};

// Set a freeform layout as default
exports.setDefaultFreeformLayout = async (req, res) => {
    try {
        // Unset current default
        await FreeformLayout.updateMany(
            { isDefault: true },
            { isDefault: false }
        );

        // Set new default
        const layout = await FreeformLayout.findByIdAndUpdate(
            req.params.id,
            { isDefault: true, updatedAt: new Date() },
            { new: true }
        );

        if (!layout) {
            return res.status(404).json({ error: 'Freeform layout not found' });
        }

        res.json(layout);
    } catch (error) {
        console.error('Error setting default freeform layout:', error);
        res.status(500).json({ error: 'Failed to set default freeform layout', details: error.message });
    }
};

// Duplicate a freeform layout
exports.duplicateFreeformLayout = async (req, res) => {
    try {
        const originalLayout = await FreeformLayout.findById(req.params.id);

        if (!originalLayout) {
            return res.status(404).json({ error: 'Freeform layout not found' });
        }

        // Create a copy with new IDs
        const duplicatedElements = originalLayout.elements.map(el => ({
            ...el.toObject(),
            id: `${el.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));

        const duplicatedGroups = originalLayout.groups.map(group => ({
            ...group.toObject(),
            id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));

        const duplicatedLayout = new FreeformLayout({
            name: req.body.name || `${originalLayout.name} (Copy)`,
            description: originalLayout.description,
            canvas: originalLayout.canvas,
            elements: duplicatedElements,
            groups: duplicatedGroups,
            viewport: { zoom: 1, panX: 0, panY: 0 },
            theme: originalLayout.theme,
            isDefault: false
        });

        await duplicatedLayout.save();
        res.status(201).json(duplicatedLayout);
    } catch (error) {
        console.error('Error duplicating freeform layout:', error);
        res.status(500).json({ error: 'Failed to duplicate freeform layout', details: error.message });
    }
};

// Save canvas state (auto-save endpoint)
exports.saveCanvasState = async (req, res) => {
    try {
        const { elements, viewport, canvas } = req.body;

        const updateData = {
            updatedAt: new Date()
        };

        if (elements !== undefined) updateData.elements = elements;
        if (viewport !== undefined) updateData.viewport = viewport;
        if (canvas !== undefined) updateData.canvas = canvas;

        const layout = await FreeformLayout.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!layout) {
            return res.status(404).json({ error: 'Freeform layout not found' });
        }

        res.json({ success: true, updatedAt: layout.updatedAt });
    } catch (error) {
        console.error('Error saving canvas state:', error);
        res.status(500).json({ error: 'Failed to save canvas state', details: error.message });
    }
};
