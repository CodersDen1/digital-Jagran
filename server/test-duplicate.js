const API_URL = 'http://localhost:5001/api';

async function testDuplicate() {
    try {
        // 1. Get all layouts
        console.log('Fetching layouts...');
        const response = await fetch(`${API_URL}/layouts`);
        const layouts = await response.json();

        if (layouts.length === 0) {
            console.log('No layouts found to test.');
            return;
        }

        const layout = layouts[0];
        console.log(`Using layout: ${layout.name} (${layout._id})`);

        if (layout.elements.length === 0) {
            console.log('Layout has no elements to duplicate.');
            return;
        }

        const elementToDuplicate = layout.elements[0];
        console.log(`Duplicating element: ${elementToDuplicate.id}`);

        // 2. Duplicate element
        const duplicateResponse = await fetch(`${API_URL}/layouts/${layout._id}/elements/${elementToDuplicate.id}/duplicate`, {
            method: 'POST'
        });

        if (duplicateResponse.ok) {
            console.log('Duplication request successful.');

            // 3. Verify
            const updatedLayout = await duplicateResponse.json();
            console.log(`Original element count: ${layout.elements.length}`);
            console.log(`New element count: ${updatedLayout.elements.length}`);

            if (updatedLayout.elements.length === layout.elements.length + 1) {
                console.log('SUCCESS: Element count increased by 1.');

                // Find the new element (it should be after the original, index 0, so index 1)
                const newElement = updatedLayout.elements[1];

                // Basic verification
                if (newElement && newElement.id !== elementToDuplicate.id && newElement.type === elementToDuplicate.type) {
                    console.log('SUCCESS: New element has different ID and same type.');
                    console.log(`Original ID: ${elementToDuplicate.id}, New ID: ${newElement.id}`);
                } else {
                    console.log('FAILURE: ID/Type mismatch or element not found where expected.');
                }

            } else {
                console.log('FAILURE: Element count did not increase correctly.');
            }

        } else {
            console.log('FAILURE: Request failed with status', duplicateResponse.status);
            const err = await duplicateResponse.text();
            console.log('Error details:', err);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testDuplicate();
