const layoutRepository = require('../repositories/layoutRepository');

/**
 * Layout Controller
 * Handles HTTP requests for layout template operations
 * Follows Single Responsibility Principle (SRP)
 */
class LayoutController {
    /**
     * Create a new layout template
     * POST /api/layouts
     */
    async createLayout(req, res) {
        try {
            const layoutData = req.body;

            // Validate required fields
            if (!layoutData.name) {
                return res.status(400).json({ error: 'Layout name is required' });
            }

            const newLayout = await layoutRepository.create(layoutData);
            res.status(201).json(newLayout);
        } catch (error) {
            console.error('Error creating layout:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get all layout templates
     * GET /api/layouts
     */
    async getAllLayouts(req, res) {
        try {
            const layouts = await layoutRepository.findAll();
            res.status(200).json(layouts);
        } catch (error) {
            console.error('Error fetching layouts:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get layout template by ID
     * GET /api/layouts/:id
     */
    async getLayoutById(req, res) {
        try {
            const { id } = req.params;
            const layout = await layoutRepository.findById(id);

            if (!layout) {
                return res.status(404).json({ message: 'Layout template not found' });
            }

            res.status(200).json(layout);
        } catch (error) {
            console.error('Error fetching layout:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get the default layout template
     * GET /api/layouts/default
     */
    async getDefaultLayout(req, res) {
        try {
            const layout = await layoutRepository.findDefault();

            if (!layout) {
                return res.status(404).json({ message: 'No default layout found' });
            }

            res.status(200).json(layout);
        } catch (error) {
            console.error('Error fetching default layout:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Update layout template
     * PUT /api/layouts/:id
     */
    async updateLayout(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const updatedLayout = await layoutRepository.update(id, updateData);

            if (!updatedLayout) {
                return res.status(404).json({ message: 'Layout template not found' });
            }

            res.status(200).json(updatedLayout);
        } catch (error) {
            console.error('Error updating layout:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Delete layout template (soft delete)
     * DELETE /api/layouts/:id
     */
    async deleteLayout(req, res) {
        try {
            const { id } = req.params;
            const deletedLayout = await layoutRepository.delete(id);

            if (!deletedLayout) {
                return res.status(404).json({ message: 'Layout template not found' });
            }

            res.status(200).json({ message: 'Layout template deleted successfully' });
        } catch (error) {
            console.error('Error deleting layout:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Set layout as default
     * PUT /api/layouts/:id/set-default
     */
    async setDefaultLayout(req, res) {
        try {
            const { id } = req.params;
            const layout = await layoutRepository.setAsDefault(id);

            if (!layout) {
                return res.status(404).json({ message: 'Layout template not found' });
            }

            res.status(200).json(layout);
        } catch (error) {
            console.error('Error setting default layout:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Duplicate layout template
     * POST /api/layouts/:id/duplicate
     */
    async duplicateLayout(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            const duplicatedLayout = await layoutRepository.duplicate(id, name);
            res.status(201).json(duplicatedLayout);
        } catch (error) {
            console.error('Error duplicating layout:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new LayoutController();
