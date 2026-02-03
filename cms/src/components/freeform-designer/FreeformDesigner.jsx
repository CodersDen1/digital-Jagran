import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { freeformLayoutService, articleService } from '../../services/api';
import Layout from '../common/Layout';
import FreeformCanvas from './FreeformCanvas';
import FreeformToolbar from './FreeformToolbar';
import FreeformPropertiesPanel from './FreeformPropertiesPanel';
import {
    Save, Eye, ArrowLeft, Undo, Redo, Home,
    ZoomIn, ZoomOut, Maximize, Grid3X3, Magnet,
    FileText, Palette, Settings, Ruler, Hand, MousePointer2, Upload, Lock
} from 'lucide-react';
import { generateHtml } from '../../utils/generateHtml';

/**
 * FreeformDesigner - Main component for the New Legacy Editor
 * Provides a Figma/Wix-like experience for designing layouts with free positioning
 */
const FreeformDesigner = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Check mode
    const isArticleEdit = location.pathname.includes('/edit-freeform/');
    const isLayoutEdit = Boolean(id) && !isArticleEdit;

    // Layout state
    const [layoutName, setLayoutName] = useState('');
    const [layoutDescription, setLayoutDescription] = useState('');
    const [elements, setElements] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [clipboard, setClipboard] = useState([]);

    // Canvas settings
    const [canvas, setCanvas] = useState({
        // Calculation: 1280px (max-w-7xl) - 32px (container px-4) - 64px (card md:p-8) = 1184px
        width: 1184,
        height: 1800,
        backgroundColor: '#ffffff',
        showGrid: true,
        gridSize: 20,
        snapToGrid: false,
        snapToElements: true
    });

    // Viewport state
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

    // UI state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    // Editor mode: 'layout' for template only, 'article' for creating articles
    const [editorMode, setEditorMode] = useState('layout');
    const [tool, setTool] = useState('select'); // 'select' or 'hand'

    // Article data (when in article mode)
    const [articleData, setArticleData] = useState({});
    const [language, setLanguage] = useState('en');
    const [isPublish, setIsPublish] = useState(false);
    const [seoMetadata, setSeoMetadata] = useState('');
    const [seoKeywords, setSeoKeywords] = useState('');
    const [seoSlug, setSeoSlug] = useState('');
    const [articleTags, setArticleTags] = useState('');
    const [showSeoPanel, setShowSeoPanel] = useState(false);
    const [showCanvasSettings, setShowCanvasSettings] = useState(false);

    // History for undo/redo
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const maxHistory = 50;

    // Load existing layout or article if editing
    useEffect(() => {
        if (isArticleEdit) {
            loadArticleForEdit();
        } else if (isLayoutEdit) {
            loadLayout();
        } else {
            setLayoutName('New Freeform Layout');
            setElements(getDefaultElements());
            pushToHistory([]);
        }
    }, [id, isArticleEdit]);

    /* ... handlers ... */

    const loadArticleForEdit = async () => {
        setLoading(true);
        try {
            const article = await articleService.getById(id);
            setEditorMode('article');

            // Set article metadata
            const articleLang = article.published_language === 'hi' ? 'HN' : (article.published_language || 'en');
            setLanguage(articleLang);
            setSeoMetadata(article.metadata || article.metadata_en || '');
            const keywords = article.keywords || article.keywords_en || [];
            setSeoKeywords(Array.isArray(keywords) ? keywords.join(', ') : (keywords || ''));
            setSeoSlug(article.slug || '');
            const tags = article.tags || article.tags_en || [];
            setArticleTags(Array.isArray(tags) ? tags.join(', ') : (tags || ''));
            setIsPublish(article.is_Published);

            // Fetch the layout template
            if (article.layoutTemplate) {
                // Try to get freeform layout
                try {
                    const layout = await freeformLayoutService.getById(article.layoutTemplate);
                    setLayoutName(layout.name);
                    setLayoutDescription(layout.description || '');
                    setElements(layout.elements || []);
                    setCanvas(layout.canvas || canvas);
                    if (layout.viewport) {
                        setZoom(layout.viewport.zoom || 1);
                        setPanOffset({ x: layout.viewport.panX || 0, y: layout.viewport.panY || 0 });
                    }
                    pushToHistory(layout.elements || []);
                } catch (e) {
                    console.error("Layout not found or not freeform", e);
                    // Fallback or alert?
                }
            }

            // Load content
            if (article.elementContent_en) {
                setArticleData(article.elementContent_en);
            }
        } catch (error) {
            console.error('Error loading article:', error);
            alert('Failed to load article');
        } finally {
            setLoading(false);
        }
    };

    const loadLayout = async () => {
        /* ... existing loadLayout ... */
        setLoading(true);
        try {
            const layout = await freeformLayoutService.getById(id);
            setLayoutName(layout.name);
            setLayoutDescription(layout.description || '');
            setElements(layout.elements || []);
            setCanvas(layout.canvas || canvas);
            if (layout.viewport) {
                setZoom(layout.viewport.zoom || 1);
                setPanOffset({ x: layout.viewport.panX || 0, y: layout.viewport.panY || 0 });
            }
            pushToHistory(layout.elements || []);
        } catch (error) {
            console.error('Error loading layout:', error);
            alert('Failed to load layout');
        } finally {
            setLoading(false);
        }
    };

    /* ... existing functions ... */

    // Save as article (in article mode)
    const saveArticle = async (publish = false) => {
        setSaving(true);
        try {
            // Build article payload from articleData
            const isEn = language === 'en';

            // Map element IDs to article fields
            const getContentByType = (type) => {
                const element = elements.find(el => el.type === type);
                return element ? (articleData[element.id] || '') : '';
            };

            // Get all photos from image elements
            const photoUrls = elements
                .filter(el => el.type === 'image')
                .map(el => articleData[el.id])
                .filter(Boolean);

            const payload = {
                photos: photoUrls,
                video: getContentByType('video'),
                is_Drafted: !publish,
                is_Published: publish,
                author: getContentByType('author') || 'Unknown',
                published_language: language,
                elementContent_en: articleData,
            };

            // First, save layout and get its ID
            // For updates, we create a NEW layout version to preserve history/modifications
            // In a more complex system, we might update the existing layout if it's 1:1 with article
            const layoutData = {
                name: `Article Layout - ${new Date().toISOString()}`,
                description: `Layout for article ${id || 'new'}`,
                elements,
                canvas,
                viewport: { zoom, panX: panOffset.x, panY: panOffset.y }
            };

            const savedLayout = await freeformLayoutService.create(layoutData);
            payload.layoutTemplate = savedLayout._id;

            // Map textual fields based on selected language
            const tagsValue = articleTags || getContentByType('tags') || '';
            const tagsArray = tagsValue.split(',').map(s => s.trim()).filter(Boolean);

            // Generate HTML
            // We need to construct a temporary layout object merging current elements/canvas
            const currentLayout = {
                elements,
                canvas,
                viewport: { zoom, panX: panOffset.x, panY: panOffset.y }
            };

            const html = generateHtml(currentLayout, articleData, language);

            if (isEn) {
                payload.article_header_en = getContentByType('header');
                payload.summary_en = getContentByType('summary');
                payload.body_en = getContentByType('body');
                payload.tags_en = tagsArray;
                payload.htmlContent_en = html;
            } else {
                payload.article_header = getContentByType('header');
                payload.summary = getContentByType('summary');
                payload.body = getContentByType('body');
                payload.tags = tagsArray;
                payload.htmlContent = html;
            }

            // Add SEO metadata
            payload.metadata = seoMetadata;
            payload.keywords = seoKeywords.split(',').map(s => s.trim()).filter(Boolean);
            payload.slug = seoSlug;

            if (isArticleEdit) {
                await articleService.update(id, payload);
                alert(publish ? 'Article Updated & Published!' : 'Article Updated!');
            } else {
                await articleService.create(payload);
                alert(publish ? 'Article published successfully!' : 'Article saved as draft!');
            }
            navigate('/');
        } catch (error) {
            console.error('Error saving article:', error);
            const msg = error.response?.data?.error || 'Failed to save article';
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdKey = isMac ? e.metaKey : e.ctrlKey;

            // Delete selected
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
                e.preventDefault();
                deleteSelected();
            }

            // Copy
            if (cmdKey && e.key === 'c' && selectedIds.length > 0) {
                e.preventDefault();
                copySelected();
            }

            // Paste
            if (cmdKey && e.key === 'v' && clipboard.length > 0) {
                e.preventDefault();
                pasteElements();
            }

            // Duplicate
            if (cmdKey && e.key === 'd' && selectedIds.length > 0) {
                e.preventDefault();
                duplicateSelected();
            }

            // Undo
            if (cmdKey && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                undo();
            }

            // Redo
            if (cmdKey && e.shiftKey && e.key === 'z') {
                e.preventDefault();
                redo();
            }

            // Select all
            if (cmdKey && e.key === 'a') {
                e.preventDefault();
                setSelectedIds(elements.map(el => el.id));
            }

            // Deselect
            if (e.key === 'Escape') {
                setSelectedIds([]);
            }

            // Move with arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
                e.preventDefault();
                const delta = e.shiftKey ? 10 : 1;
                const direction = {
                    ArrowUp: { x: 0, y: -delta },
                    ArrowDown: { x: 0, y: delta },
                    ArrowLeft: { x: -delta, y: 0 },
                    ArrowRight: { x: delta, y: 0 }
                }[e.key];

                if (direction) moveSelectedBy(direction.x, direction.y);
            }

            // Tool switching
            if (e.key.toLowerCase() === 'v' && !cmdKey) {
                setTool('select');
            }
            if (e.key.toLowerCase() === 'h' && !cmdKey) {
                setTool('hand');
            }

            // Bring forward / Send backward
            if (cmdKey && e.key === ']') {
                e.preventDefault();
                bringForward();
            }
            if (cmdKey && e.key === '[') {
                e.preventDefault();
                sendBackward();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, elements, clipboard, historyIndex]);



    // Default elements for new layout
    const getDefaultElements = () => [
        {
            id: 'header-1',
            type: 'header',
            x: 50,
            y: 50,
            width: 700,
            height: 60,
            zIndex: 1,
            rotation: 0,
            opacity: 100,
            locked: false,
            visible: true,
            config: {
                fontSize: '4xl',
                fontWeight: 'bold',
                fontFamily: 'serif',
                textAlign: 'left',
                textColor: '#1f2937'
            }
        },
        {
            id: 'image-1',
            type: 'image',
            x: 50,
            y: 130,
            width: 700,
            height: 400,
            zIndex: 2,
            rotation: 0,
            opacity: 100,
            locked: false,
            visible: true,
            config: {
                objectFit: 'cover',
                borderRadius: 8
            }
        },
        {
            id: 'body-1',
            type: 'body',
            x: 50,
            y: 560,
            width: 700,
            height: 300,
            zIndex: 3,
            rotation: 0,
            opacity: 100,
            locked: false,
            visible: true,
            config: {
                fontSize: 'lg',
                fontFamily: 'serif',
                lineHeight: 'relaxed',
                textColor: '#374151'
            }
        }
    ];

    // Element operations
    const addElement = (type, x = 100, y = 100) => {
        const newElement = createNewElement(type, x, y);
        const newElements = [...elements, newElement];
        setElements(newElements);
        setSelectedIds([newElement.id]);
        pushToHistory(newElements);
    };

    const createNewElement = (type, x, y) => {
        const id = `${type}-${Date.now()}`;
        const defaults = getElementDefaults(type);

        return {
            id,
            type,
            x,
            y,
            width: defaults.width,
            height: defaults.height,
            zIndex: Math.max(...elements.map(el => el.zIndex), 0) + 1,
            rotation: 0,
            opacity: 100,
            locked: false,
            visible: true,
            config: defaults.config
        };
    };

    const getElementDefaults = (type) => {
        const defaults = {
            header: { width: 500, height: 60, config: { fontSize: '3xl', fontWeight: 'bold', fontFamily: 'serif', textColor: '#1f2937' } },
            summary: { width: 500, height: 100, config: { fontSize: 'xl', fontFamily: 'serif', textColor: '#6b7280' } },
            body: { width: 600, height: 300, config: { fontSize: 'base', fontFamily: 'serif', lineHeight: 'relaxed', textColor: '#374151' } },
            image: { width: 400, height: 300, config: { objectFit: 'cover', borderRadius: 8 } },
            video: { width: 500, height: 280, config: { borderRadius: 8 } },
            author: { width: 200, height: 50, config: { fontSize: 'sm', textColor: '#6b7280' } },
            date: { width: 150, height: 30, config: { fontSize: 'sm', textColor: '#9ca3af' } },
            tags: { width: 300, height: 40, config: { fontSize: 'sm' } },
            text: { width: 300, height: 100, config: { fontSize: 'base', customContent: 'Custom text...' } },
            divider: { width: 400, height: 2, config: { backgroundColor: '#e5e7eb' } },
            spacer: { width: 100, height: 50, config: {} },
            shape: { width: 150, height: 150, config: { shapeType: 'rectangle', fillColor: '#4f46e5', borderRadius: 0 } },
            container: { width: 400, height: 300, config: { backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' } }
        };
        return defaults[type] || { width: 200, height: 100, config: {} };
    };

    const updateElement = (elementId, updates) => {
        const currentElement = elements.find(el => el.id === elementId);

        // Check for group movement (x or y changes)
        if (currentElement && currentElement.groupId && (updates.x !== undefined || updates.y !== undefined)) {
            const dx = (updates.x !== undefined) ? updates.x - currentElement.x : 0;
            const dy = (updates.y !== undefined) ? updates.y - currentElement.y : 0;

            // If just properties (opacity etc), don't propagate unless designed to? 
            // For now only position propagates.

            if (dx === 0 && dy === 0) {
                // No position change, just regular update
                const newElements = elements.map(el =>
                    el.id === elementId ? { ...el, ...updates } : el
                );
                setElements(newElements);
                pushToHistory(newElements);
                return;
            }

            const newElements = elements.map(el => {
                // Move siblings in same group
                if (el.groupId === currentElement.groupId && !el.locked) {
                    // Current element gets specific updates (might handle snapping)
                    if (el.id === elementId) {
                        return { ...el, ...updates };
                    }
                    // Siblings get delta
                    return { ...el, x: el.x + dx, y: el.y + dy };
                }
                return el;
            });
            setElements(newElements);
            pushToHistory(newElements);
        } else {
            const newElements = elements.map(el =>
                el.id === elementId ? { ...el, ...updates } : el
            );
            setElements(newElements);
            pushToHistory(newElements);
        }
    };

    const updateElementConfig = (elementId, configUpdates) => {
        const newElements = elements.map(el =>
            el.id === elementId ? { ...el, config: { ...el.config, ...configUpdates } } : el
        );
        setElements(newElements);
        pushToHistory(newElements);
    };

    const updateMultipleElements = (updates) => {
        const newElements = elements.map(el => {
            if (selectedIds.includes(el.id)) {
                return { ...el, ...updates };
            }
            return el;
        });
        setElements(newElements);
        pushToHistory(newElements);
    };

    const deleteSelected = () => {
        const newElements = elements.filter(el => !selectedIds.includes(el.id));
        setElements(newElements);
        setSelectedIds([]);
        pushToHistory(newElements);
    };

    const checkAndExpandCanvas = (element) => {
        const padding = 200;
        const rightEdge = element.x + element.width;
        const bottomEdge = element.y + element.height;

        setCanvas(prev => {
            let newWidth = prev.width;
            let newHeight = prev.height;
            let changed = false;

            // Width is fixed/constant, do not expand
            // if (rightEdge + padding > prev.width) {
            //     newWidth = Math.max(prev.width, rightEdge + padding);
            //     changed = true;
            // }

            if (bottomEdge + padding > prev.height) {
                newHeight = Math.max(prev.height, bottomEdge + padding);
                changed = true;
            }

            if (changed) {
                return { ...prev, width: newWidth, height: newHeight };
            }
            return prev;
        });
    };

    // Grouping
    const groupSelected = () => {
        if (selectedIds.length < 2) return;

        const groupId = `group-${Date.now()}`;
        const groupElement = {
            id: groupId,
            type: 'group',
            visible: true,
            locked: false,
            zIndex: Math.max(...elements.map(el => el.zIndex), 0) + 1,
            // Calculate bounding box for group (optional, but good for UI)
            // For now, just a logical grouping
        };

        const newElements = elements.map(el => {
            if (selectedIds.includes(el.id)) {
                return { ...el, groupId };
            }
            return el;
        });

        // Add group element
        newElements.push(groupElement);

        setElements(newElements);
        setSelectedIds([groupId]); // Select the group
        pushToHistory(newElements);
    };

    const ungroupSelected = () => {
        const selectedGroups = elements.filter(el => selectedIds.includes(el.id) && el.type === 'group');
        if (selectedGroups.length === 0) return;

        const groupIdsToRemove = selectedGroups.map(g => g.id);

        let newElements = elements.filter(el => !groupIdsToRemove.includes(el.id));
        newElements = newElements.map(el => {
            if (el.groupId && groupIdsToRemove.includes(el.groupId)) {
                const { groupId, ...rest } = el;
                return rest;
            }
            return el;
        });

        // Select the children of the ungrouped groups
        const childrenIds = elements
            .filter(el => el.groupId && groupIdsToRemove.includes(el.groupId))
            .map(el => el.id);

        setElements(newElements);
        setSelectedIds(childrenIds);
        pushToHistory(newElements);
    };

    const copySelected = () => {
        // If a group is selected, we need to copy the group element AND its children
        // If children are selected but not their group, just copy children (unless we enforce full group selection)

        const elementsToCopy = [];
        const groupsToCopy = [];

        // Check if explicit groups are selected
        const selectedGroups = elements.filter(el => selectedIds.includes(el.id) && el.type === 'group');
        selectedGroups.forEach(g => groupsToCopy.push(g));

        // Get children of selected groups
        const groupIds = selectedGroups.map(g => g.id);
        elements.forEach(el => {
            if (el.groupId && groupIds.includes(el.groupId)) {
                elementsToCopy.push(el);
            } else if (selectedIds.includes(el.id) && !el.groupId) {
                // Standalone selected elements
                elementsToCopy.push(el);
            }
        });

        const clipboardData = {
            groups: groupsToCopy,
            elements: elementsToCopy
        };

        setClipboard(clipboardData);
    };

    const pasteElements = () => {
        if (!clipboard.elements && !clipboard.length) return;

        // Legacy clipboard support (array of elements)
        const isLegacy = Array.isArray(clipboard);
        const sourceElements = isLegacy ? clipboard : clipboard.elements;
        const sourceGroups = isLegacy ? [] : clipboard.groups;

        if (sourceElements.length === 0 && sourceGroups.length === 0) return;

        const offset = 20;
        const groupIdMap = {}; // oldGroupId -> newGroupId

        // Function to generate new ID
        const generateId = (type) => `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create new groups first
        const newGroups = sourceGroups.map(g => {
            const newId = generateId('group');
            groupIdMap[g.id] = newId;
            return {
                ...g,
                id: newId,
                zIndex: Math.max(...elements.map(e => e.zIndex), 0) + 1
            };
        });

        // Create new elements
        const newPastedElements = sourceElements.map(el => {
            return {
                ...el,
                id: generateId(el.type),
                groupId: el.groupId ? groupIdMap[el.groupId] : undefined, // Remap to new group
                x: el.x + offset,
                y: el.y + offset,
                zIndex: Math.max(...elements.map(e => e.zIndex), 0) + 1
            };
        });

        const updatedElements = [...elements, ...newGroups, ...newPastedElements];
        setElements(updatedElements);

        // Select pasted items (groups prefers)
        const newSelection = [...newGroups.map(g => g.id), ...newPastedElements.filter(e => !e.groupId).map(e => e.id)];

        // Use a Set to avoid duplicates if any logic overlaps
        setSelectedIds([...new Set(newSelection)]);
        pushToHistory(updatedElements);
    };

    const duplicateSelected = () => {
        copySelected();
        setTimeout(() => pasteElements(), 0);
    };

    const moveSelectedBy = (dx, dy) => {
        const groupIdsToMove = elements.filter(el => selectedIds.includes(el.id) && el.type === 'group').map(g => g.id);

        const newElements = elements.map(el => {
            // Move if:
            // 1. Explicitly selected AND (not a child OR is a standalone child) - check logic
            // 2. Child of a selected group

            const isSelected = selectedIds.includes(el.id);
            const isChildOfSelectedGroup = el.groupId && groupIdsToMove.includes(el.groupId);

            // Note: If a group is selected, 'selectedIds' contains group ID. Children are NOT in selectedIds usually.
            // But if we move a group, we must move its children.

            // If element is locked, don't move
            if (el.locked) return el;

            if (isSelected || isChildOfSelectedGroup) {
                // If it's a group element itself, strictly it doesn't have x/y usually, but if we add coords to group later:
                if (el.type === 'group') return el;

                return { ...el, x: el.x + dx, y: el.y + dy };
            }
            return el;
        });
        setElements(newElements);
    };

    const bringForward = () => {
        if (selectedIds.length === 0) return;
        const maxZ = Math.max(...elements.map(el => el.zIndex));

        // If group selected, update group Z AND children Z? 
        // Simple approach: Update Z of all selected items + children of selected groups

        const groupIds = elements.filter(el => selectedIds.includes(el.id) && el.type === 'group').map(g => g.id);

        const newElements = elements.map(el => {
            if (selectedIds.includes(el.id) || (el.groupId && groupIds.includes(el.groupId))) {
                return { ...el, zIndex: maxZ + 1 };
            }
            return el;
        });

        setElements(newElements);
        pushToHistory(newElements);
    };

    const sendBackward = () => {
        if (selectedIds.length === 0) return;
        const minZ = Math.min(...elements.map(el => el.zIndex));

        const groupIds = elements.filter(el => selectedIds.includes(el.id) && el.type === 'group').map(g => g.id);

        const newElements = elements.map(el => {
            if (selectedIds.includes(el.id) || (el.groupId && groupIds.includes(el.groupId))) {
                return { ...el, zIndex: Math.max(1, minZ - 1) };
            }
            return el;
        });

        setElements(newElements);
        pushToHistory(newElements);
    };

    // History management
    const pushToHistory = (newElements) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.stringify(newElements));
        if (newHistory.length > maxHistory) {
            newHistory.shift();
        }
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
                canvas,
                viewport: { zoom, panX: panOffset.x, panY: panOffset.y }
            };

            if (isEditing) {
                await freeformLayoutService.update(id, layoutData);
            } else {
                await freeformLayoutService.create(layoutData);
            }

            alert('Layout saved successfully!');
            navigate('/freeform-layouts');
        } catch (error) {
            console.error('Error saving layout:', error);
            alert('Failed to save layout');
        } finally {
            setSaving(false);
        }
    };

    // Handle Drag and Drop from Toolbar
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const elementType = e.dataTransfer.getData('element-type');
        const shapeType = e.dataTransfer.getData('shape-type'); // Optional

        if (!elementType) return;

        // Calculate drop position relative to canvas
        const canvasRect = e.currentTarget.getBoundingClientRect();

        // Adjust for zoom and pan
        // The mouse position relative to the visible container
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        // Convert to canvas coordinates
        // Canvas transform is: translate(panOffset.x, panOffset.y) scale(zoom)
        // Inverse: (mouse - pan) / zoom
        // However, the drop target is the wrapper, not the transformed inner canvas.
        // Wait, the wrapper is "flex-1 relative overflow-hidden bg-slate-900"
        // The inner canvas is rendered with margin 40px inside that wrapper (usually centered or something)
        // Actually FreeformCanvas renders a div with margin: 40px inside the container.

        // Let's assume (0,0) of the layout is at (panOffset.x + 40, panOffset.y + 40) relative to wrapper?
        // FreeformCanvas source: 
        // canvas-inner margin: '40px'
        // transform: translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})

        // So the effective origin (0,0 of the logical canvas) relative to the wrapper is:
        // x = 40 + panOffset.x
        // y = 40 + panOffset.y

        // So:
        // droppedX = (mouseX - (40 + panOffset.x)) / zoom
        // droppedY = (mouseY - (40 + panOffset.y)) / zoom

        const x = (mouseX - (40 + panOffset.x)) / zoom;
        const y = (mouseY - (40 + panOffset.y)) / zoom;

        // Add the element
        const newElement = createNewElement(elementType, x, y);

        // If it's a shape, we might need to update its config
        if (elementType === 'shape' && shapeType) {
            newElement.config.shapeType = shapeType;
            if (shapeType === 'circle') newElement.config.borderRadius = '50%';
        }

        const newElements = [...elements, newElement];
        setElements(newElements);
        setSelectedIds([newElement.id]);
        pushToHistory(newElements);
    };

    // Import HTML Handler
    const fileInputRef = useRef(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const htmlContent = event.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            // Data to populate
            const newArticleData = { ...articleData };
            let seoUpdates = {};

            // 1. Title/Headline
            const h1 = doc.querySelector('h1');
            const title = doc.querySelector('title');
            const headlineText = h1 ? h1.innerText : (title ? title.innerText : '');

            if (headlineText) {
                // Find first header element
                const headerEl = elements.find(el => el.type === 'header');
                if (headerEl) {
                    newArticleData[headerEl.id] = headlineText;
                }
            }

            // 2. Metadata & Keywords & Summary
            const metaDesc = doc.querySelector('meta[name="description"]');
            const summaryText = metaDesc ? metaDesc.content : '';

            if (summaryText) {
                seoUpdates.metadata = summaryText;
                setSeoMetadata(summaryText);

                // Find first summary element
                const summaryEl = elements.find(el => el.type === 'summary');
                if (summaryEl) {
                    newArticleData[summaryEl.id] = summaryText;
                }
            }

            const metaKeywords = doc.querySelector('meta[name="keywords"]');
            if (metaKeywords) {
                const keywords = metaKeywords.content;
                setSeoKeywords(keywords);
                seoUpdates.keywords = keywords;
            }

            // 3. Body Content & Styles
            // Extract styles
            const styles = Array.from(doc.querySelectorAll('style')).map(s => s.outerHTML).join('\n');

            // Get body content
            const body = doc.body;

            // Remove scripts
            const scripts = body.querySelectorAll('script');
            scripts.forEach(s => s.remove());

            // Combine styles + body
            const bodyContent = `${styles}\n${body.innerHTML}`;

            // Find first body element
            const bodyEl = elements.find(el => el.type === 'body');
            if (bodyEl) {
                newArticleData[bodyEl.id] = bodyContent;
            }

            // Update state
            setArticleData(newArticleData);

            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';

            alert('HTML Imported Successfully! Please review the content.');
        };
        reader.readAsText(file);
    };

    // Handle content change from editable elements
    const handleContentChange = (elementId, value) => {
        setArticleData(prev => ({
            ...prev,
            [elementId]: value
        }));
    };

    // Zoom controls
    const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 4));
    const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.1));
    const handleFitToScreen = () => {
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
    };

    const selectedElements = elements.filter(el => selectedIds.includes(el.id));

    if (loading) {
        return (
            <Layout hideSidebar>
                <div className="flex justify-center items-center h-screen bg-slate-900">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout hideSidebar>
            <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
                {/* Header Bar */}
                <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                            title="Dashboard"
                        >
                            <Home size={18} />
                        </button>
                        <button
                            onClick={() => navigate('/freeform-layouts')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
                        >
                            <ArrowLeft size={18} />
                            <span className="text-sm">Back</span>
                        </button>
                        <div className="h-5 w-px bg-slate-600"></div>
                        <input
                            type="text"
                            value={layoutName}
                            onChange={(e) => setLayoutName(e.target.value)}
                            placeholder="Layout Name"
                            className="text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-white placeholder-slate-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Mode Toggle */}
                        <div className="flex items-center bg-slate-700 rounded-lg p-0.5">
                            <button
                                onClick={() => setEditorMode('layout')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${editorMode === 'layout'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Palette size={14} />
                                <span>Layout</span>
                            </button>
                            <button
                                onClick={() => setEditorMode('article')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition ${editorMode === 'article'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <FileText size={14} />
                                <span>Article</span>
                            </button>
                        </div>

                        {/* Language selector (only in article mode) */}
                        {editorMode === 'article' && (
                            <div className="flex items-center bg-slate-700 rounded-lg p-0.5 ml-2">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`px-3 py-1.5 rounded-md text-sm transition ${language === 'en'
                                        ? 'bg-white text-slate-900'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => setLanguage('HN')}
                                    className={`px-3 py-1.5 rounded-md text-sm transition ${language === 'HN'
                                        ? 'bg-white text-slate-900'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    हिंदी
                                </button>
                            </div>
                        )}

                        {/* SEO Settings (only in article mode) */}
                        {editorMode === 'article' && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowSeoPanel(!showSeoPanel)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ml-2 ${showSeoPanel
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        }`}
                                    title="SEO Settings"
                                >
                                    <Settings size={14} />
                                    <span>SEO</span>
                                </button>

                                {/* SEO Panel Dropdown */}
                                {showSeoPanel && (
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4 z-50">
                                        <h3 className="text-white font-medium mb-3">SEO Settings</h3>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">
                                                    Slug (URL)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={seoSlug}
                                                    onChange={(e) => setSeoSlug(e.target.value)}
                                                    placeholder="my-custom-slug"
                                                    className="w-full bg-slate-700 text-white text-sm rounded-lg p-2 border border-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">
                                                    Meta Description
                                                </label>
                                                <textarea
                                                    value={seoMetadata}
                                                    onChange={(e) => setSeoMetadata(e.target.value)}
                                                    placeholder="Enter SEO description for search engines..."
                                                    className="w-full bg-slate-700 text-white text-sm rounded-lg p-2 border border-slate-600 focus:border-indigo-500 focus:outline-none resize-none"
                                                    rows={3}
                                                />
                                                <span className="text-xs text-slate-500">{seoMetadata.length}/160</span>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">
                                                    Keywords (comma-separated)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={seoKeywords}
                                                    onChange={(e) => setSeoKeywords(e.target.value)}
                                                    placeholder="news, politics, india..."
                                                    className="w-full bg-slate-700 text-white text-sm rounded-lg p-2 border border-slate-600 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">
                                                    Tags (comma-separated)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={articleTags}
                                                    onChange={(e) => setArticleTags(e.target.value)}
                                                    placeholder="Politics, Economy, Breaking..."
                                                    className="w-full bg-slate-700 text-white text-sm rounded-lg p-2 border border-slate-600 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowSeoPanel(false)}
                                            className="mt-3 w-full py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
                                        >
                                            Done
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="h-5 w-px bg-slate-600 mx-2"></div>

                        {/* Undo/Redo */}
                        <button
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition disabled:opacity-30"
                            title="Undo (Cmd+Z)"
                        >
                            <Undo size={18} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition disabled:opacity-30"
                            title="Redo (Cmd+Shift+Z)"
                        >
                            <Redo size={18} />
                        </button>

                        <div className="h-5 w-px bg-slate-600 mx-2"></div>

                        {/* Tools: Select / Hand */}
                        <div className="flex items-center bg-slate-700 rounded-lg p-0.5">
                            <button
                                onClick={() => setTool('select')}
                                className={`p-1.5 rounded-md transition ${tool === 'select'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                    }`}
                                title="Select Tool (V)"
                            >
                                <MousePointer2 size={16} />
                            </button>
                            <button
                                onClick={() => setTool('hand')}
                                className={`p-1.5 rounded-md transition ${tool === 'hand'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                    }`}
                                title="Hand Tool (H)"
                            >
                                <Hand size={16} />
                            </button>
                        </div>

                        <div className="h-5 w-px bg-slate-600 mx-2"></div>

                        {/* Canvas settings */}
                        <button
                            onClick={() => setCanvas({ ...canvas, showGrid: !canvas.showGrid })}
                            className={`p-2 rounded-lg transition ${canvas.showGrid ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            title="Toggle Grid"
                        >
                            <Grid3X3 size={18} />
                        </button>
                        <button
                            onClick={() => setCanvas({ ...canvas, snapToElements: !canvas.snapToElements })}
                            className={`p-2 rounded-lg transition ${canvas.snapToElements ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            title="Snap to Elements"
                        >
                            <Magnet size={18} />
                        </button>

                        {/* Canvas Size */}
                        <div className="relative">
                            <button
                                onClick={() => setShowCanvasSettings(!showCanvasSettings)}
                                className={`p-2 rounded-lg transition ${showCanvasSettings ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                title="Canvas Size"
                            >
                                <Ruler size={18} />
                            </button>

                            {showCanvasSettings && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-4 z-50">
                                    <h3 className="text-white font-medium mb-3 text-sm">Canvas Size</h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Width (px)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={canvas.width}
                                                    disabled
                                                    className="w-full bg-slate-700 text-slate-400 text-sm rounded-lg p-2 border border-slate-600 cursor-not-allowed focus:outline-none"
                                                />
                                                <Lock className="absolute right-3 top-2.5 text-slate-500" size={14} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Height (px)</label>
                                            <input
                                                type="number"
                                                value={canvas.height}
                                                onChange={(e) => setCanvas({ ...canvas, height: parseInt(e.target.value) || 600 })}
                                                className="w-full bg-slate-700 text-white text-sm rounded-lg p-2 border border-slate-600 focus:border-indigo-500 focus:outline-none"
                                                min={400}
                                                max={10000}
                                            />
                                        </div>

                                        <div className="text-xs text-slate-500 mt-2">
                                            <span className="block">Tip: Match height to your content</span>
                                            <span className="block">to avoid empty space on client.</span>
                                        </div>

                                        <button
                                            onClick={() => setShowCanvasSettings(false)}
                                            className="w-full py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-5 w-px bg-slate-600 mx-2"></div>

                        {/* Preview */}
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-sm ${previewMode
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            <Eye size={16} />
                            <span>Preview</span>
                        </button>

                        {/* Save buttons - conditional based on mode */}
                        {editorMode === 'layout' ? (
                            <button
                                onClick={saveLayout}
                                disabled={saving}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                            >
                                <Save size={16} />
                                <span>{saving ? 'Saving...' : 'Save Layout'}</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => saveArticle(false)}
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-slate-700 text-white px-4 py-1.5 rounded-lg hover:bg-slate-600 transition text-sm disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                                </button>
                                <button
                                    onClick={() => saveArticle(true)}
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition text-sm disabled:opacity-50"
                                >
                                    <span>{saving ? 'Publishing...' : 'Publish'}</span>
                                </button>
                            </>
                        )}
                        {/* Import HTML (Article Mode Only) */}
                        {editorMode === 'article' && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept=".html,.htm"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    onClick={handleImportClick}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition ml-2"
                                    title="Import HTML"
                                >
                                    <Upload size={14} />
                                    <span>Import</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Toolbar */}
                    {!previewMode && (
                        <FreeformToolbar
                            onAddElement={addElement}
                            elements={elements}
                            selectedIds={selectedIds}
                            onSelectElement={(id, multi) => {
                                // If multi-select modifier is held (handled in toolbar optionally)
                                if (multi) {
                                    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                                } else {
                                    setSelectedIds([id]);
                                }
                            }}
                            onReorderLayers={(newElements) => {
                                setElements(newElements);
                                pushToHistory(newElements);
                            }}
                            onGroup={groupSelected}
                            onUngroup={ungroupSelected}
                            onDelete={deleteSelected}
                        />
                    )}

                    {/* Canvas Area */}
                    <div
                        className="flex-1 relative overflow-hidden bg-slate-900"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <FreeformCanvas
                            elements={elements}
                            selectedIds={selectedIds}
                            onSelectElement={(id, multi) => {
                                if (multi) {
                                    setSelectedIds(prev =>
                                        prev.includes(id)
                                            ? prev.filter(i => i !== id)
                                            : [...prev, id]
                                    );
                                } else {
                                    setSelectedIds([id]);
                                }
                            }}
                            onSelectMultiple={setSelectedIds}
                            onClearSelection={() => setSelectedIds([])}
                            onUpdateElement={updateElement}
                            onDeleteElement={(id) => {
                                const newElements = elements.filter(el => el.id !== id);
                                setElements(newElements);
                                setSelectedIds([]);
                                pushToHistory(newElements);
                            }}
                            canvas={canvas}
                            zoom={zoom}
                            panOffset={panOffset}
                            onPanChange={setPanOffset}
                            previewMode={previewMode}
                            snapToElements={canvas.snapToElements}
                            onElementChangeEnd={checkAndExpandCanvas}
                            editorMode={editorMode}
                            articleData={articleData}
                            onContentChange={handleContentChange}
                            tool={tool}
                        />

                        {/* Zoom Controls */}
                        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-800 rounded-lg p-1 shadow-lg">
                            <button
                                onClick={handleZoomOut}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
                                title="Zoom Out"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="text-sm text-slate-300 w-14 text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
                                title="Zoom In"
                            >
                                <ZoomIn size={16} />
                            </button>
                            <div className="h-4 w-px bg-slate-600"></div>
                            <button
                                onClick={handleFitToScreen}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
                                title="Fit to Screen"
                            >
                                <Maximize size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Right Properties Panel */}
                    {!previewMode && selectedElements.length > 0 && (
                        <FreeformPropertiesPanel
                            selectedElements={selectedElements}
                            onUpdateElement={updateElement}
                            onUpdateConfig={updateElementConfig}
                            onDelete={deleteSelected}
                            onDuplicate={duplicateSelected}
                            onBringForward={bringForward}
                            onSendBackward={sendBackward}
                            onClose={() => setSelectedIds([])}
                            editorMode={editorMode}
                            articleData={articleData}
                            onContentChange={handleContentChange}
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default FreeformDesigner;
