const LayoutTemplate = require('../models/LayoutTemplate');

/**
 * Layout Repository
 * Handles all data access operations for layout templates
 * Follows Single Responsibility Principle (SRP)
 */
class LayoutRepository {
    /**
     * Create a new layout template
     * @param {Object} data - Layout template data
     * @returns {Promise<Object>} Created layout template
     */
    async create(data) {
        const layout = new LayoutTemplate(data);
        return await layout.save();
    }

    /**
     * Find all active layout templates
     * @returns {Promise<Array>} Array of layout templates
     */
    async findAll() {
        return await LayoutTemplate.find({ isActive: true })
            .sort({ createdAt: -1 });
    }

    /**
     * Find layout template by ID
     * @param {string} id - Layout template ID
     * @returns {Promise<Object|null>} Layout template or null
     */
    async findById(id) {
        return await LayoutTemplate.findById(id);
    }

    /**
     * Find the default layout template
     * @returns {Promise<Object|null>} Default layout template or null
     */
    async findDefault() {
        return await LayoutTemplate.getDefault();
    }

    /**
     * Update layout template by ID
     * @param {string} id - Layout template ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object|null>} Updated layout template or null
     */
    async update(id, data) {
        return await LayoutTemplate.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true, runValidators: true }
        );
    }

    /**
     * Soft delete layout template (set isActive to false)
     * @param {string} id - Layout template ID
     * @returns {Promise<Object|null>} Updated layout template or null
     */
    async delete(id) {
        return await LayoutTemplate.findByIdAndUpdate(
            id,
            { isActive: false, updatedAt: new Date() },
            { new: true }
        );
    }

    /**
     * Hard delete layout template (permanent removal)
     * @param {string} id - Layout template ID
     * @returns {Promise<Object|null>} Deleted layout template or null
     */
    async hardDelete(id) {
        return await LayoutTemplate.findByIdAndDelete(id);
    }

    /**
     * Set a layout as the default
     * @param {string} id - Layout template ID
     * @returns {Promise<Object|null>} Updated layout template or null
     */
    async setAsDefault(id) {
        // First, unset all defaults
        await LayoutTemplate.updateMany(
            { isDefault: true },
            { isDefault: false }
        );
        // Then set the new default
        return await LayoutTemplate.findByIdAndUpdate(
            id,
            { isDefault: true, updatedAt: new Date() },
            { new: true }
        );
    }

    /**
     * Find layout templates by name (partial match)
     * @param {string} name - Name to search
     * @returns {Promise<Array>} Array of matching layout templates
     */
    async findByName(name) {
        return await LayoutTemplate.find({
            name: { $regex: name, $options: 'i' },
            isActive: true
        });
    }

    /**
     * Duplicate a layout template
     * @param {string} id - Layout template ID to duplicate
     * @param {string} newName - Name for the duplicated template
     * @returns {Promise<Object>} New duplicated layout template
     */
    async duplicate(id, newName) {
        const original = await this.findById(id);
        if (!original) {
            throw new Error('Layout template not found');
        }

        const duplicateData = {
            name: newName || `${original.name} (Copy)`,
            description: original.description,
            elements: original.elements,
            gridGap: original.gridGap,
            maxWidth: original.maxWidth,
            containerPadding: original.containerPadding,
            theme: original.theme,
            isDefault: false,
            isActive: true
        };

        return await this.create(duplicateData);
    }
}

module.exports = new LayoutRepository();
