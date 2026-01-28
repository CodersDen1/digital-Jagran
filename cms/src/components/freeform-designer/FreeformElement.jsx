import React, { useRef, useState, useCallback } from 'react';
import { Lock, Unlock, Trash2 } from 'lucide-react';

/**
 * FreeformElement - Draggable and resizable element on the canvas
 * Supports 8-point resizing, drag positioning, and rotation
 */
const FreeformElement = ({
    element,
    isSelected,
    previewMode,
    onSelect,
    onUpdate,
    onDelete,
    onDragStart,
    onDrag,
    onDragEnd,
    onResizeEnd,
    zoom,
    children
}) => {
    const elementRef = useRef(null);

    // Use refs for mutable state during drag/resize to avoid stale closures in event listeners
    const stateRef = useRef({
        isDragging: false,
        isResizing: false,
        resizeHandle: null,
        dragOffset: { x: 0, y: 0 },
        initial: null // { x, y, width, height, mouseX, mouseY }
    });

    // State for UI rendering only
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);

    // Resize handles configuration
    const handles = [
        { position: 'nw', cursor: 'nwse-resize', top: -4, left: -4 },
        { position: 'n', cursor: 'ns-resize', top: -4, left: '50%', transform: 'translateX(-50%)' },
        { position: 'ne', cursor: 'nesw-resize', top: -4, right: -4 },
        { position: 'e', cursor: 'ew-resize', top: '50%', right: -4, transform: 'translateY(-50%)' },
        { position: 'se', cursor: 'nwse-resize', bottom: -4, right: -4 },
        { position: 's', cursor: 'ns-resize', bottom: -4, left: '50%', transform: 'translateX(-50%)' },
        { position: 'sw', cursor: 'nesw-resize', bottom: -4, left: -4 },
        { position: 'w', cursor: 'ew-resize', top: '50%', left: -4, transform: 'translateY(-50%)' }
    ];

    // Start dragging
    const handleMouseDown = (e) => {
        if (previewMode || element.locked) return;
        if (e.target.classList.contains('resize-handle')) return;

        e.stopPropagation();
        onSelect(e);

        const rect = elementRef.current.getBoundingClientRect();
        const offset = {
            x: e.clientX / zoom - element.x,
            y: e.clientY / zoom - element.y
        };

        stateRef.current.isDragging = true;
        stateRef.current.dragOffset = offset;
        setIsDragging(true);

        onDragStart();

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = useCallback((e) => {
        if (stateRef.current.isDragging && !element.locked) {
            let newX = e.clientX / zoom - stateRef.current.dragOffset.x;
            let newY = e.clientY / zoom - stateRef.current.dragOffset.y;

            // Apply snapping
            const snapped = onDrag(newX, newY);
            if (snapped) {
                newX = snapped.x;
                newY = snapped.y;
            }

            onUpdate({ x: Math.round(newX), y: Math.round(newY) });
        }
    }, [zoom, element.locked, onDrag, onUpdate]);

    const handleMouseUp = useCallback(() => {
        stateRef.current.isDragging = false;
        setIsDragging(false);
        onDragEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [onDragEnd]);

    // Start resizing
    const handleResizeStart = (e, handle) => {
        if (previewMode || element.locked) return;
        e.stopPropagation();
        e.preventDefault();

        stateRef.current.isResizing = true;
        stateRef.current.resizeHandle = handle;
        stateRef.current.initial = {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            mouseX: e.clientX / zoom,
            mouseY: e.clientY / zoom
        };

        setResizeHandle(handle);
        setIsResizing(true); // For UI updates

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = useCallback((e) => {
        const state = stateRef.current;
        if (!state.isResizing || !state.initial || !state.resizeHandle) return;

        const deltaX = e.clientX / zoom - state.initial.mouseX;
        const deltaY = e.clientY / zoom - state.initial.mouseY;

        let newX = state.initial.x;
        let newY = state.initial.y;
        let newWidth = state.initial.width;
        let newHeight = state.initial.height;

        const minSize = 20;

        switch (state.resizeHandle) {
            case 'nw':
                newX = state.initial.x + deltaX;
                newY = state.initial.y + deltaY;
                newWidth = Math.max(minSize, state.initial.width - deltaX);
                newHeight = Math.max(minSize, state.initial.height - deltaY);
                if (newWidth <= minSize) newX = state.initial.x + state.initial.width - minSize;
                if (newHeight <= minSize) newY = state.initial.y + state.initial.height - minSize;
                break;
            case 'n':
                newY = state.initial.y + deltaY;
                newHeight = Math.max(minSize, state.initial.height - deltaY);
                if (newHeight <= minSize) newY = state.initial.y + state.initial.height - minSize;
                break;
            case 'ne':
                newY = state.initial.y + deltaY;
                newWidth = Math.max(minSize, state.initial.width + deltaX);
                newHeight = Math.max(minSize, state.initial.height - deltaY);
                if (newHeight <= minSize) newY = state.initial.y + state.initial.height - minSize;
                break;
            case 'e':
                newWidth = Math.max(minSize, state.initial.width + deltaX);
                break;
            case 'se':
                newWidth = Math.max(minSize, state.initial.width + deltaX);
                newHeight = Math.max(minSize, state.initial.height + deltaY);
                break;
            case 's':
                newHeight = Math.max(minSize, state.initial.height + deltaY);
                break;
            case 'sw':
                newX = state.initial.x + deltaX;
                newWidth = Math.max(minSize, state.initial.width - deltaX);
                newHeight = Math.max(minSize, state.initial.height + deltaY);
                if (newWidth <= minSize) newX = state.initial.x + state.initial.width - minSize;
                break;
            case 'w':
                newX = state.initial.x + deltaX;
                newWidth = Math.max(minSize, state.initial.width - deltaX);
                if (newWidth <= minSize) newX = state.initial.x + state.initial.width - minSize;
                break;
        }

        onUpdate({
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newWidth),
            height: Math.round(newHeight)
        });
    }, [zoom, onUpdate]);

    const handleResizeEnd = useCallback(() => {
        stateRef.current.isResizing = false;
        stateRef.current.resizeHandle = null;
        stateRef.current.initial = null;

        setIsResizing(false);
        setResizeHandle(null);

        if (onResizeEnd) onResizeEnd();

        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    }, [handleResizeMove, onResizeEnd]);

    // Toggle lock
    const handleToggleLock = (e) => {
        e.stopPropagation();
        onUpdate({ locked: !element.locked });
    };

    return (
        <div
            ref={elementRef}
            className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isSelected && !previewMode ? 'ring-2 ring-indigo-500' : ''}`}
            style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                zIndex: element.zIndex,
                transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                opacity: element.opacity / 100,
                visibility: element.visible ? 'visible' : 'hidden',
                pointerEvents: element.visible ? 'auto' : 'none',
                transition: isDragging || isResizing ? 'none' : 'box-shadow 0.15s ease'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Element Content */}
            <div className="w-full h-full overflow-hidden select-none">
                {children}
            </div>

            {/* Selection UI */}
            {isSelected && !previewMode && (
                <>
                    {/* Resize Handles */}
                    {!element.locked && handles.map((handle) => (
                        <div
                            key={handle.position}
                            className="resize-handle absolute w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm hover:bg-indigo-100"
                            style={{
                                cursor: handle.cursor,
                                top: handle.top,
                                left: handle.left,
                                right: handle.right,
                                bottom: handle.bottom,
                                transform: handle.transform,
                                zIndex: 10
                            }}
                            onMouseDown={(e) => handleResizeStart(e, handle.position)}
                        />
                    ))}

                    {/* Element Info Badge */}
                    <div className="absolute -top-7 left-0 flex items-center gap-1 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg">
                        <span className="font-medium capitalize">{element.type}</span>
                        <span className="text-slate-400">
                            {Math.round(element.width)} × {Math.round(element.height)}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute -top-7 right-0 flex items-center gap-1">
                        <button
                            className={`p-1 rounded ${element.locked ? 'bg-amber-500' : 'bg-slate-700'} text-white hover:opacity-80 transition`}
                            onClick={handleToggleLock}
                            title={element.locked ? 'Unlock' : 'Lock'}
                        >
                            {element.locked ? <Lock size={12} /> : <Unlock size={12} />}
                        </button>
                        {!element.locked && (
                            <button
                                className="p-1 rounded bg-red-500 text-white hover:bg-red-600 transition"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                title="Delete"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>

                    {/* Lock Overlay */}
                    {element.locked && (
                        <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center pointer-events-none">
                            <Lock size={24} className="text-amber-500/50" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default FreeformElement;
