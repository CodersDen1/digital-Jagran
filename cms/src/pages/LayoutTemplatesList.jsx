import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { layoutService } from '../services/api';
import Layout from '../components/common/Layout';
import { Plus, Edit, Trash2, Copy, Star, StarOff, Eye } from 'lucide-react';

/**
 * LayoutTemplatesList - Page showing all saved layout templates
 */
const LayoutTemplatesList = () => {
    const [layouts, setLayouts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLayouts();
    }, []);

    const loadLayouts = async () => {
        setLoading(true);
        try {
            const data = await layoutService.getAll();
            setLayouts(data);
        } catch (error) {
            console.error('Error loading layouts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this layout template?')) {
            try {
                await layoutService.delete(id);
                loadLayouts();
            } catch (error) {
                console.error('Error deleting layout:', error);
                alert('Failed to delete layout');
            }
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await layoutService.setDefault(id);
            loadLayouts();
        } catch (error) {
            console.error('Error setting default:', error);
            alert('Failed to set as default');
        }
    };

    const handleDuplicate = async (id, name) => {
        try {
            await layoutService.duplicate(id, `${name} (Copy)`);
            loadLayouts();
        } catch (error) {
            console.error('Error duplicating layout:', error);
            alert('Failed to duplicate layout');
        }
    };

    // Count elements in layout for display
    const getElementCount = (layout) => {
        return layout.elements?.length || 0;
    };

    // Get element types summary
    const getElementTypes = (layout) => {
        if (!layout.elements || layout.elements.length === 0) return 'No elements';
        const types = [...new Set(layout.elements.map(el => el.type))];
        return types.slice(0, 3).join(', ') + (types.length > 3 ? '...' : '');
    };

    return (
        <Layout>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Layout Templates</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Create and manage article page layouts
                    </p>
                </div>
                <Link
                    to="/layouts/new"
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-800 transition"
                >
                    <Plus size={20} />
                    <span>New Layout</span>
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : layouts.length === 0 ? (
                <div className="bg-white p-12 rounded-lg shadow text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Eye size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Layout Templates Yet</h3>
                    <p className="text-gray-500 mb-6">
                        Create your first layout template to customize how articles are displayed.
                    </p>
                    <Link
                        to="/layouts/new"
                        className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-md hover:bg-blue-800 transition"
                    >
                        <Plus size={20} />
                        <span>Create Your First Layout</span>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {layouts.map((layout) => (
                        <div
                            key={layout._id}
                            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition group"
                        >
                            {/* Preview area */}
                            <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 p-4 relative">
                                {/* Mini preview of layout structure */}
                                <div className="h-full flex flex-col gap-1">
                                    {layout.elements?.slice(0, 5).map((el, idx) => (
                                        <div
                                            key={idx}
                                            className={`bg-white/60 rounded ${el.type === 'header' ? 'h-6' :
                                                el.type === 'image' ? 'h-12' :
                                                    el.type === 'body' ? 'flex-1' :
                                                        'h-4'
                                                }`}
                                            style={{ width: `${(el.width / 12) * 100}%` }}
                                        />
                                    ))}
                                </div>

                                {/* Default badge */}
                                {layout.isDefault && (
                                    <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                        <Star size={12} fill="currentColor" />
                                        <span>Default</span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-1">{layout.name}</h3>
                                <p className="text-sm text-gray-500 mb-3">
                                    {layout.description || getElementTypes(layout)}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                                    <span>{getElementCount(layout)} elements</span>
                                    <span>•</span>
                                    <span>
                                        {new Date(layout.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 border-t pt-3">
                                    <Link
                                        to={`/layouts/${layout._id}`}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
                                    >
                                        <Edit size={16} />
                                        <span>Edit</span>
                                    </Link>

                                    <button
                                        onClick={() => handleDuplicate(layout._id, layout.name)}
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                                        title="Duplicate"
                                    >
                                        <Copy size={18} />
                                    </button>

                                    <button
                                        onClick={() => handleSetDefault(layout._id)}
                                        className={`p-2 rounded transition ${layout.isDefault
                                            ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                                            : 'text-gray-500 hover:text-yellow-500 hover:bg-gray-100'
                                            }`}
                                        title={layout.isDefault ? 'Default template' : 'Set as default'}
                                    >
                                        {layout.isDefault ? <Star size={18} fill="currentColor" /> : <StarOff size={18} />}
                                    </button>

                                    <button
                                        onClick={() => handleDelete(layout._id)}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    );
};

export default LayoutTemplatesList;
