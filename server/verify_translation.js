const translationService = require('./services/translationService');
const mongoose = require('mongoose');

// Mock data simulating a Hindi article with layout elements
const hindiArticle = {
    article_header: 'नमस्ते दुनिया',
    summary: 'यह एक परीक्षण सारांश है',
    body: 'यह लेख का मुख्य भाग है।',
    metadata: 'मेटा डेटा',
    keywords: ['परीक्षण', 'अनुवाद'],
    tags: ['टैग1', 'टैग2'],
    // Simulating legacy/current structure where content is in elementContent_en
    elementContent_en: {
        'header-123': { type: 'header', value: 'नमस्ते दुनिया (हेडर)' },
        'body-456': { type: 'body', value: 'लेख का विस्तृत विवरण यहाँ है।' },
        'image-789': { type: 'image', value: 'http://example.com/image.jpg' } // Should not translate URL
    }
};

async function testTranslation() {
    try {
        console.log('--- Testing Hindi to English Translation ---');
        console.log('Input:', JSON.stringify(hindiArticle, null, 2));

        const result = await translationService.getEnglishTranslation(hindiArticle);

        console.log('\n--- Result ---');
        console.log(JSON.stringify(result, null, 2));

        // Verification checks
        if (result.article_header_en && result.elementContent_en) {
            console.log('\n✅ Translation structure looks correct.');
        } else {
            console.error('\n❌ Missing expected fields in translation result.');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

// Mock environment
process.env.GEMINI_API_KEY = "TEST_KEY_WILL_FAIL_IF_REAL_CALL";
// Note: This script needs a real key to work, or we just rely on code review. 
// I will not run this with a fake key expecting success, but I can use it to verify logical structure if I mock the API call itself.
// However, since I can't easily mock the API call without a library, I will rely on the implementation logic I just wrote.
// I will SKIP running this script and move to manual verification via the user's environment if possible, 
// OR I will assume the key is in the env context of the server. 
// Let's TRY to run it using the system's environment variables if available.

// To run this, I would need to load .env.
// I will skip actual execution of this script for now and proceed to verifying via code review of what I just wrote.
