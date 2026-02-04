import React, { useEffect, useRef } from 'react';

const EditorCanvas = ({
    htmlContent,
    viewMode,
    onSelectElement,
    onHoverElement,
    iframeRef // Forwarding ref from parent for direct manipulation if needed
}) => {

    // Internal ref if parent doesn't provide one (though parent usually should for Saving)
    const localRef = useRef(null);
    const ref = iframeRef || localRef;

    useEffect(() => {
        if (!ref.current || !htmlContent) return;

        const doc = ref.current.contentDocument;
        doc.open();
        doc.write(htmlContent);
        doc.close();

        // Inject Editor Styles
        const style = doc.createElement('style');
        style.textContent = `
        body { 
            min-height: 100vh; 
            padding-bottom: 40px;
            cursor: default;
        }
        *[data-editor-hover="true"] {
            outline: 2px solid #6366f1 !important;
            cursor: move; /* Indicate draggable */
        }
        *[data-editor-selected="true"] {
            outline: 2px solid #4f46e5 !important;
            position: relative;
        }
        [contenteditable]:focus {
            outline: 2px dashed #4f46e5;
            min-height: 1em;
        }
        /* Drop Indicators */
        .drop-target-top {
            border-top: 3px solid #6366f1 !important;
        }
        .drop-target-bottom {
            border-bottom: 3px solid #6366f1 !important;
        }
        
        div:empty {
            min-height: 50px;
            background: rgba(99, 102, 241, 0.05);
            border: 1px dashed rgba(99, 102, 241, 0.3);
        }
    `;
        doc.head.appendChild(style);

        // --- Drag and Drop Logic ---
        let draggedElement = null;

        const handleDragStart = (e) => {
            // Prevent contentEditable from interfering
            if (e.target.isContentEditable) return;

            draggedElement = e.target;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.target.outerHTML); // Fallback

            // Add opacity to dragged item (optional)
            setTimeout(() => {
                if (e.target) e.target.style.opacity = '0.5';
            }, 0);
        };

        const handleDragEnd = (e) => {
            if (e.target) e.target.style.opacity = '1';
            draggedElement = null;
            // Cleanup all drop targets
            doc.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach(el => {
                el.classList.remove('drop-target-top', 'drop-target-bottom');
            });
        };

        const handleDragOver = (e) => {
            e.preventDefault(); // Necessary to allow dropping
            e.dataTransfer.dropEffect = 'move';

            const target = e.target;
            if (target === draggedElement || target.contains(draggedElement)) return;

            // Calculate Top/Bottom half
            const rect = target.getBoundingClientRect();
            const offset = e.clientY - rect.top;

            // Clear previous on this element
            target.classList.remove('drop-target-top', 'drop-target-bottom');

            if (offset < rect.height / 2) {
                target.classList.add('drop-target-top');
            } else {
                target.classList.add('drop-target-bottom');
            }
        };

        const handleDragLeave = (e) => {
            e.target.classList.remove('drop-target-top', 'drop-target-bottom');
        };

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const target = e.target;
            // Cleanup visuals
            target.classList.remove('drop-target-top', 'drop-target-bottom');

            // Check for External Drop (Sidebar)
            const externalData = e.dataTransfer.getData('application/x-visual-editor-element');
            if (externalData) {
                try {
                    const elementDef = JSON.parse(externalData);
                    let newEl;

                    // Creation logic (mirrors handleAddElement)
                    if (elementDef.html) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = elementDef.html.trim();
                        newEl = tempDiv.firstChild;
                    } else {
                        newEl = document.createElement(elementDef.tag);
                        if (elementDef.text) newEl.innerText = elementDef.text;
                        if (elementDef.src) newEl.setAttribute('src', elementDef.src);
                        if (elementDef.href) newEl.setAttribute('href', elementDef.href);
                        if (elementDef.className) newEl.className = elementDef.className;
                    }

                    // Insert logic
                    const rect = target.getBoundingClientRect();
                    const offset = e.clientY - rect.top;

                    if (offset < rect.height / 2) {
                        target.parentNode.insertBefore(newEl, target);
                    } else {
                        target.parentNode.insertBefore(newEl, target.nextSibling);
                    }

                    // Select and edit
                    newEl.click(); // Trigger click handler to select

                } catch (err) {
                    console.error('Failed to parse dropped element', err);
                }
                return;
            }

            // Internal Reordering Logic
            if (!draggedElement || target === draggedElement) return;

            // Determine Drop Position
            const rect = target.getBoundingClientRect();
            const offset = e.clientY - rect.top;

            if (offset < rect.height / 2) {
                // Drop Before
                target.parentNode.insertBefore(draggedElement, target);
            } else {
                // Drop After
                target.parentNode.insertBefore(draggedElement, target.nextSibling);
            }

            // Restore focus/selection logic if needed
            // Re-trigger global listeners for cleanliness
        };


        // Event Listeners
        const handleMouseOver = (e) => {
            e.stopPropagation();
            if (e.target === doc.body) return;

            const prev = doc.querySelector('[data-editor-hover="true"]');
            if (prev) prev.removeAttribute('data-editor-hover');

            e.target.setAttribute('data-editor-hover', 'true');
            e.target.setAttribute('draggable', 'true'); // Enable dragging on hover

            if (onHoverElement) onHoverElement(e.target);
        };

        const handleMouseOut = (e) => {
            e.target.removeAttribute('data-editor-hover');
            e.target.removeAttribute('draggable'); // Clean up
            if (onHoverElement) onHoverElement(null);
        };

        const handleClick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Clear previous selection
            const prev = doc.querySelector('[data-editor-selected="true"]');
            if (prev) prev.removeAttribute('data-editor-selected');

            e.target.setAttribute('data-editor-selected', 'true');

            // Construct selection object
            const selectionData = {
                tagName: e.target.tagName.toLowerCase(),
                text: e.target.innerText,
                href: e.target.getAttribute('href'),
                src: e.target.getAttribute('src'),
                styles: window.getComputedStyle(e.target),
                domNode: e.target
            };

            onSelectElement(selectionData);

            // Enable text editing (and disable dragging to allow text select)
            doc.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
            e.target.contentEditable = true;
            e.target.removeAttribute('draggable'); // Cannot drag while editing text
            e.target.focus();
        };

        doc.body.addEventListener('mouseover', handleMouseOver);
        doc.body.addEventListener('mouseout', handleMouseOut);
        doc.body.addEventListener('click', handleClick);

        // DnD Listeners
        doc.body.addEventListener('dragstart', handleDragStart);
        doc.body.addEventListener('dragend', handleDragEnd);
        doc.body.addEventListener('dragover', handleDragOver);
        doc.body.addEventListener('dragleave', handleDragLeave);
        doc.body.addEventListener('drop', handleDrop);

        // Cleanup
        return () => {
            if (doc && doc.body) {
                doc.body.removeEventListener('mouseover', handleMouseOver);
                doc.body.removeEventListener('mouseout', handleMouseOut);
                doc.body.removeEventListener('click', handleClick);

                doc.body.removeEventListener('dragstart', handleDragStart);
                doc.body.removeEventListener('dragend', handleDragEnd);
                doc.body.removeEventListener('dragover', handleDragOver);
                doc.body.removeEventListener('dragleave', handleDragLeave);
                doc.body.removeEventListener('drop', handleDrop);
            }
        };

    }, [htmlContent]); // Re-init if content changes radically (initial load)

    return (
        <div className="flex-1 bg-slate-950 flex justify-center overflow-auto py-8">
            <div
                className="bg-white transition-all duration-300 shadow-2xl origin-top"
                style={{
                    width: viewMode === 'mobile' ? '375px' : '100%',
                    maxWidth: viewMode === 'mobile' ? '375px' : '1200px',
                    height: 'fit-content',
                    minHeight: '800px',
                    transform: viewMode === 'mobile' ? 'scale(1)' : 'scale(1)' // Can add zoom later
                }}
            >
                <iframe
                    ref={ref}
                    title="Editor Canvas"
                    className="w-full h-full min-h-[800px] border-none"
                    sandbox="allow-same-origin allow-scripts"
                />
            </div>
        </div>
    );
};

export default EditorCanvas;
