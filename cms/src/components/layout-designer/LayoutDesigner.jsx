import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { layoutService } from '../../services/api';
import Layout from '../common/Layout';
import LayoutCanvas from './LayoutCanvas';
import LayoutToolbar from './LayoutToolbar';
import LayoutPropertiesPanel from './LayoutPropertiesPanel';
import { Save, Eye, ArrowLeft, Undo, Redo, Home } from 'lucide-react';

/**
 * Layout Designer - Main component for creating/editing layout templates
 * Provides a Canva-like experience for designing article detail page layouts
 */
const LayoutDesigner = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    // Layout state
    const [layoutName, setLayoutName] = useState('');
    const [layoutDescription, setLayoutDescription] = useState('');
    const [elements, setElements] = useState([]);
    const [selectedElementId, setSelectedElementId] = useState(null);
    const [gridGap, setGridGap] = useState('4');
    const [maxWidth, setMaxWidth] = useState('4xl');

    // UI state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Load existing layout if editing
    useEffect(() => {
        if (isEditing) {
            loadLayout();
        } else {
            // Set default elements for new layout
            setElements(getDefaultElements());
            setLayoutName('New Layout Template');
        }
    }, [id]);

    const loadLayout = async () => {
        setLoading(true);
        try {
            const layout = await layoutService.getById(id);
            setLayoutName(layout.name);
            setLayoutDescription(layout.description || '');
            setElements(layout.elements || []);
            setGridGap(layout.gridGap || '4');
            setMaxWidth(layout.maxWidth || '4xl');
        } catch (error) {
            console.error('Error loading layout:', error);
            alert('Failed to load layout template');
        } finally {
            setLoading(false);
        }
    };

    // Default elements for a new layout
    const getDefaultElements = () => [
        {
            id: 'header-1',
            type: 'header',
            row: 0,
            column: 0,
            width: 12,
            order: 0,
            config: {
                fontSize: '4xl',
                fontWeight: 'bold',
                fontFamily: 'serif',
                textAlign: 'left',
                marginBottom: '4'
            }
        },
        {
            id: 'summary-1',
            type: 'summary',
            row: 1,
            column: 0,
            width: 12,
            order: 1,
            config: {
                fontSize: 'xl',
                fontWeight: 'normal',
                fontFamily: 'serif',
                textAlign: 'left',
                textColor: 'gray-600',
                marginBottom: '6',
                paddingLeft: '4',
                borderColor: 'gray-300'
            }
        },
        {
            id: 'author-1',
            type: 'author',
            row: 2,
            column: 0,
            width: 8,
            order: 2,
            config: {
                fontSize: 'sm',
                marginBottom: '6'
            }
        },
        {
            id: 'date-1',
            type: 'date',
            row: 2,
            column: 8,
            width: 4,
            order: 3,
            config: {
                fontSize: 'sm',
                textAlign: 'right',
                textColor: 'gray-500',
                marginBottom: '6'
            }
        },
        {
            id: 'image-1',
            type: 'image',
            row: 3,
            column: 0,
            width: 12,
            order: 4,
            config: {
                aspectRatio: '16/9',
                objectFit: 'cover',
                borderRadius: 'md',
                marginBottom: '8'
            }
        },
        {
            id: 'body-1',
            type: 'body',
            row: 4,
            column: 0,
            width: 12,
            order: 5,
            config: {
                fontSize: 'lg',
                fontFamily: 'serif',
                lineHeight: 'relaxed',
                marginBottom: '8'
            }
        },
        {
            id: 'tags-1',
            type: 'tags',
            row: 5,
            column: 0,
            width: 12,
            order: 6,
            config: {
                fontSize: 'sm',
                marginTop: '6'
            }
        }
    ];

    // Add element to canvas
    const addElement = (type) => {
        const newElement = {
            id: `${type}-${Date.now()}`,
            type,
            row: elements.length,
            column: 0,
            width: 12,
            order: elements.length,
            config: getDefaultConfigForType(type)
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        setSelectedElementId(newElement.id);
        pushToHistory(newElements);
    };

    // Get default config based on element type
    const getDefaultConfigForType = (type) => {
        const defaults = {
            header: { fontSize: '4xl', fontWeight: 'bold', fontFamily: 'serif' },
            summary: { fontSize: 'xl', fontFamily: 'serif', textColor: 'gray-600', paddingLeft: '4' },
            body: { fontSize: 'lg', fontFamily: 'serif', lineHeight: 'relaxed' },
            image: { aspectRatio: '16/9', objectFit: 'cover', borderRadius: 'md' },
            video: { aspectRatio: '16/9' },
            author: { fontSize: 'sm' },
            date: { fontSize: 'sm', textColor: 'gray-500' },
            tags: { fontSize: 'sm' },
            text: { fontSize: 'base', customContent: 'Custom text content...' },
            divider: { marginTop: '4', marginBottom: '4', borderColor: 'gray-200' },
            spacer: { marginTop: '8', marginBottom: '8' }
        };
        return { ...defaults[type], marginBottom: '4' };
    };

    // Update element
    const updateElement = (elementId, updates) => {
        const newElements = elements.map(el =>
            el.id === elementId ? { ...el, ...updates } : el
        );
        setElements(newElements);
        pushToHistory(newElements);
    };

    // Update element config
    const updateElementConfig = (elementId, configUpdates) => {
        const newElements = elements.map(el =>
            el.id === elementId ? { ...el, config: { ...el.config, ...configUpdates } } : el
        );
        setElements(newElements);
        pushToHistory(newElements);
    };

    // Delete element
    const deleteElement = (elementId) => {
        const newElements = elements.filter(el => el.id !== elementId);
        setElements(newElements);
        setSelectedElementId(null);
        pushToHistory(newElements);
    };

    // Move element up
    const moveElementUp = (elementId) => {
        const index = elements.findIndex(el => el.id === elementId);
        if (index > 0) {
            const newElements = [...elements];
            [newElements[index - 1], newElements[index]] = [newElements[index], newElements[index - 1]];
            // Update row numbers
            newElements.forEach((el, i) => el.row = i);
            setElements(newElements);
            pushToHistory(newElements);
        }
    };

    // Move element down
    const moveElementDown = (elementId) => {
        const index = elements.findIndex(el => el.id === elementId);
        if (index < elements.length - 1) {
            const newElements = [...elements];
            [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
            // Update row numbers
            newElements.forEach((el, i) => el.row = i);
            setElements(newElements);
            pushToHistory(newElements);
        }
    };

    // Reorder elements (Drag and Drop)
    const reorderElements = (startIndex, endIndex) => {
        const result = Array.from(elements);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        // Update row numbers
        result.forEach((el, i) => el.row = i);

        setElements(result);
        pushToHistory(result); // Using local pushToHistory wrapper
    };

    // History management
    const pushToHistory = (newElements) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.stringify(newElements));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setElements(JSON.parse(history[newIndex]));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setElements(JSON.parse(history[newIndex]));
        }
    };

    // Save layout
    const saveLayout = async () => {
        if (!layoutName.trim()) {
            alert('Please enter a layout name');
            return;
        }

        setSaving(true);
        try {
            const layoutData = {
                name: layoutName,
                description: layoutDescription,
                elements,
                gridGap,
                maxWidth
            };

            if (isEditing) {
                await layoutService.update(id, layoutData);
            } else {
                await layoutService.create(layoutData);
            }

            alert('Layout saved successfully!');
            navigate('/layouts');
        } catch (error) {
            console.error('Error saving layout:', error);
            alert('Failed to save layout');
        } finally {
            setSaving(false);
        }
    };

    const selectedElement = elements.find(el => el.id === selectedElementId);

    if (loading) {
        return (
            <Layout hideSidebar>
                <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout hideSidebar>
            <div className="h-screen flex flex-col">
                {/* Header Bar */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
                            title="Dashboard"
                        >
                            <Home size={20} />
                        </button>
                        <button
                            onClick={() => navigate('/layouts')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft size={20} />
                            <span>Back to Layouts</span>
                        </button>
                        <div className="h-6 w-px bg-gray-300"></div>
                        <input
                            type="text"
                            value={layoutName}
                            onChange={(e) => setLayoutName(e.target.value)}
                            placeholder="Layout Name"
                            className="text-lg font-semibold border-none focus:outline-none focus:ring-0 bg-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                            title="Undo"
                        >
                            <Undo size={20} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                            title="Redo"
                        >
                            <Redo size={20} />
                        </button>
                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition ${previewMode
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <Eye size={18} />
                            <span>Preview</span>
                        </button>
                        <button
                            onClick={saveLayout}
                            disabled={saving}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-800 transition disabled:opacity-50"
                        >
                            <Save size={18} />
                            <span>{saving ? 'Saving...' : 'Save'}</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Toolbar */}
                    {!previewMode && (
                        <LayoutToolbar onAddElement={addElement} />
                    )}

                    {/* Canvas Area */}
                    <div className="flex-1 bg-gray-100 overflow-auto p-6">
                        <LayoutCanvas
                            elements={elements}
                            selectedElementId={selectedElementId}
                            onSelectElement={setSelectedElementId}
                            onUpdateElement={updateElement}
                            onDeleteElement={deleteElement}
                            onMoveUp={moveElementUp}
                            onMoveDown={moveElementDown}
                            onReorder={reorderElements}
                            gridGap={gridGap}
                            maxWidth={maxWidth}
                            previewMode={previewMode}
                        />
                    </div>

                    {/* Right Properties Panel */}
                    {!previewMode && selectedElement && (
                        <LayoutPropertiesPanel
                            element={selectedElement}
                            onUpdateConfig={(updates) => updateElementConfig(selectedElementId, updates)}
                            onUpdateElement={(updates) => updateElement(selectedElementId, updates)}
                            onDelete={() => deleteElement(selectedElementId)}
                            onClose={() => setSelectedElementId(null)}
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default LayoutDesigner;
