import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { freeformLayoutService } from '../services/api';
import Layout from '../components/common/Layout';
import { Plus, Edit, Trash2, Copy, Star, StarOff, Eye, Layers, Sparkles } from 'lucide-react';

/**
 * FreeformLayoutsList - Page showing all freeform layout templates
 * Premium dark-themed list view for the New Legacy Editor
 */
const FreeformLayoutsList = () => {
    const [layouts, setLayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLayouts, setSelectedLayouts] = useState([]);

    useEffect(() => {
        loadLayouts();
    }, []);

    const loadLayouts = async () => {
        setLoading(true);
        try {
            const data = await freeformLayoutService.getAll();
            setLayouts(data);
        } catch (error) {
            console.error('Error loading freeform layouts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this layout?')) {
            try {
                await freeformLayoutService.delete(id);
                loadLayouts();
            } catch (error) {
                console.error('Error deleting layout:', error);
                alert(error.response?.data?.error || 'Failed to delete layout');
            }
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await freeformLayoutService.setDefault(id);
            loadLayouts();
        } catch (error) {
            console.error('Error setting default:', error);
            alert('Failed to set as default');
        }
    };

    const handleDuplicate = async (id, name) => {
        try {
            await freeformLayoutService.duplicate(id, `${name} (Copy)`);
            loadLayouts();
        } catch (error) {
            console.error('Error duplicating layout:', error);
            alert('Failed to duplicate layout');
        }
    };

    const handleCheckboxChange = (id) => {
        setSelectedLayouts(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedLayouts(layouts.map(l => l._id));
        } else {
            setSelectedLayouts([]);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedLayouts.length === 0) return;

        if (window.confirm(`Are you sure you want to delete ${selectedLayouts.length} layouts?`)) {
            try {
                await freeformLayoutService.deleteBulk(selectedLayouts);
                setSelectedLayouts([]);
                loadLayouts();
            } catch (error) {
                console.error("Failed to delete layouts", error);
                alert('Failed to delete selected layouts');
            }
        }
    };

    const getElementCount = (layout) => {
        return layout.elementCount || layout.elements?.length || 0;
    };

    const getCanvasDimensions = (layout) => {
        if (layout.canvas) {
            return `${layout.canvas.width || 1200}×${layout.canvas.height || 1800}`;
        }
        return '1200×1800';
    };

    return (
        <Layout>
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-800">New Legacy Editor</h1>
                        </div>
                        <p className="text-gray-500 ml-13">
                            Create freeform layouts with drag-and-drop positioning like Figma or Wix
                        </p>
                    </div>
                    <Link
                        to="/freeform-layouts/new"
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg shadow-indigo-500/25"
                    >
                        <Plus size={20} />
                        <span>New Freeform Layout</span>
                    </Link>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedLayouts.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6 flex justify-between items-center border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <span className="text-blue-800 font-medium flex items-center gap-2">
                        <Layers size={18} />
                        {selectedLayouts.length} layouts selected
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 transition shadow-sm hover:shadow"
                    >
                        <Trash2 size={18} />
                        Delete Selected
                    </button>
                </div>
            )}

            {/* Selection Controls */}
            {!loading && layouts.length > 0 && (
                <div className="mb-4 flex items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <label className="flex items-center gap-3 cursor-pointer select-none text-gray-700 font-medium">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                            checked={layouts.length > 0 && selectedLayouts.length === layouts.length}
                            onChange={handleSelectAll}
                        />
                        <span>Select All Layouts</span>
                    </label>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : layouts.length === 0 ? (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-12 rounded-2xl text-center border border-slate-200">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
                        <Layers size={40} className="text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">No Freeform Layouts Yet</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Create your first freeform layout with complete design freedom. Position elements anywhere, resize freely, and build complex layouts.
                    </p>
                    <Link
                        to="/freeform-layouts/new"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg shadow-indigo-500/25"
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
                            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group border border-slate-100"
                        >
                            {/* Preview Area */}
                            <div className="h-44 bg-gradient-to-br from-slate-800 to-slate-900 p-4 relative overflow-hidden group-hover:bg-slate-800 transition-colors">
                                {/* Selection Checkbox */}
                                <div className="absolute top-3 left-3 z-20">
                                    <input
                                        type="checkbox"
                                        checked={selectedLayouts.includes(layout._id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleCheckboxChange(layout._id);
                                        }}
                                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shadow-sm cursor-pointer"
                                    />
                                </div>

                                {/* Mini canvas preview */}
                                <div className="absolute inset-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
                                    <div className="p-3 h-full flex flex-col gap-2">
                                        {layout.elements?.slice(0, 4).map((el, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-white/10 rounded"
                                                style={{
                                                    width: `${Math.min(100, (el.width / 1200) * 100)}%`,
                                                    height: el.type === 'image' ? '40%' : el.type === 'header' ? '20%' : '15%',
                                                    opacity: 0.6 + (idx * 0.1)
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Default badge */}
                                {layout.isDefault && (
                                    <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                        <Star size={12} fill="currentColor" />
                                        <span>Default</span>
                                    </div>
                                )}

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                    <Link
                                        to={`/freeform-layouts/${layout._id}`}
                                        className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-100 transition"
                                    >
                                        <Eye size={16} />
                                        Open Editor
                                    </Link>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-1 truncate">{layout.name}</h3>
                                <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                                    {layout.description || 'Freeform canvas layout'}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                                    <span className="flex items-center gap-1">
                                        <Layers size={12} />
                                        {getElementCount(layout)} elements
                                    </span>
                                    <span>•</span>
                                    <span>{getCanvasDimensions(layout)}</span>
                                    <span>•</span>
                                    <span>
                                        {new Date(layout.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                    <Link
                                        to={`/freeform-layouts/${layout._id}`}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                                    >
                                        <Edit size={14} />
                                        <span>Edit</span>
                                    </Link>

                                    <button
                                        onClick={() => handleDuplicate(layout._id, layout.name)}
                                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                        title="Duplicate"
                                    >
                                        <Copy size={16} />
                                    </button>

                                    <button
                                        onClick={() => handleSetDefault(layout._id)}
                                        className={`p-2 rounded-lg transition ${layout.isDefault
                                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                                            : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'
                                            }`}
                                        title={layout.isDefault ? 'Default' : 'Set as default'}
                                    >
                                        {layout.isDefault ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                                    </button>

                                    <button
                                        onClick={() => handleDelete(layout._id)}
                                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Banner */}
            <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Sparkles size={24} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-1">New Legacy Editor Features</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Position elements freely on a canvas with pixel-perfect control.
                            Use 8-point resizing, multi-select, alignment guides, and keyboard shortcuts
                            just like professional design tools. Perfect for creating unique, complex layouts.
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FreeformLayoutsList;
