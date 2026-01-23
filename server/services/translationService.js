const { GoogleGenerativeAI } = require("@google/generative-ai");

class TranslationService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    /**
     * Translates missing fields in the article data using Google Gemini.
     * Handles both English -> Hindi and Hindi -> English.
     */
    async translateArticle(data) {
        // Legacy support function
        return data;
    }

    /**
     * Translates English fields to Hindi and returns ONLY the translated fields.
     */
    async getHindiTranslation(data) {
        const enToHiPayload = {};
        // Map English fields to Hindi equivalents
        if (data.article_header_en) enToHiPayload.article_header = data.article_header_en;
        if (data.summary_en) enToHiPayload.summary = data.summary_en;
        if (data.body_en) enToHiPayload.body = data.body_en;
        if (data.metadata_en) enToHiPayload.metadata = data.metadata_en;
        if (data.keywords_en && data.keywords_en.length > 0) enToHiPayload.keywords = data.keywords_en;
        if (data.tags_en && data.tags_en.length > 0) enToHiPayload.tags = data.tags_en;

        // Handle Layout Elements (elementContent_en)
        // We want to translate the 'value' of each element but keep the structure key (elementId)
        if (data.elementContent_en && Object.keys(data.elementContent_en).length > 0) {
            enToHiPayload.elementContent = {};
            for (const [key, element] of Object.entries(data.elementContent_en)) {
                // Only translate text-based elements that have a string value
                if (element && typeof element.value === 'string' && element.value.trim() !== '') {
                    // We will send a map to Gemini: { "elementId": "text value" }
                    // Note: We'll attach this to a special key to separate it from main fields if needed,
                    // but for simplicity, let's just translate it line-by-line or as a block.
                    // A better approach for Gemini is to send the whole structure.
                    // Let's rely on the bulk translation.
                    // We'll treat `elementContent` as a special object where we only translate `value` nested inside.
                    // However, the current `callGemini` is simple flat JSON.
                    // Let's map it to a flat structure for translation: `element_KEY_value`
                    enToHiPayload[`element_${key}`] = element.value;
                }
            }
        }

        if (Object.keys(enToHiPayload).length === 0) return {};

        try {
            console.log("Translating English to Hindi (Async)...", Object.keys(enToHiPayload));
            const translatedFlat = await this.callGemini(enToHiPayload, "English", "Hindi");

            // Reconstruct the nested elementContent object
            const finalResult = {};
            const elementContentTranslated = {};

            for (const [key, value] of Object.entries(translatedFlat)) {
                if (key.startsWith('element_')) {
                    const originalKey = key.replace('element_', '');
                    // Preserve the original type and config, only update value
                    if (data.elementContent_en[originalKey]) {
                        elementContentTranslated[originalKey] = {
                            ...data.elementContent_en[originalKey], // Keep type, config, etc.
                            value: value
                        };
                    }
                } else {
                    finalResult[key] = value;
                }
            }

            if (Object.keys(elementContentTranslated).length > 0) {
                finalResult.elementContent = elementContentTranslated;
            }

            return finalResult;

        } catch (error) {
            console.error("Translation error:", error);
            return {};
        }
    }

    /**
     * Translates Hindi fields to English and returns ONLY the translated fields.
     */
    async getEnglishTranslation(data) {
        const hiToEnPayload = {};

        // Map Hindi fields to English equivalents (Source -> Target Key in Payload for Gemini)
        // We want Gemini to return keys like 'article_header_en', 'summary_en'.
        // BUT my prompt rule says "Maintain the exact keys". 
        // So we should send keys as we want them to appear in the OUTPUT.
        // Input Value comes from Source (Hindi), Input Key is Destination (English).

        const sourceElements = data.elementContent_en || data.elementContent;
        const hasElements = sourceElements && Object.keys(sourceElements).length > 0;

        if (data.article_header) hiToEnPayload.article_header_en = data.article_header;
        if (data.summary) hiToEnPayload.summary_en = data.summary;

        // ONLY translate body if there are NO layout elements. 
        // If elements exist, the frontend should render those instead of the bulk body text.
        // This prevents duplication ("5 times same") and respects the user's wish for structure changes.
        if (!hasElements && data.body) {
            hiToEnPayload.body_en = data.body;
        }

        if (data.metadata) hiToEnPayload.metadata_en = data.metadata;
        if (data.keywords && data.keywords.length > 0) hiToEnPayload.keywords_en = data.keywords;
        if (data.tags && data.tags.length > 0) hiToEnPayload.tags_en = data.tags;

        if (hasElements) {
            for (const [key, element] of Object.entries(sourceElements)) {
                if (element && typeof element.value === 'string' && element.value.trim() !== '') {
                    // We use a prefix to identify these as elements to be reconstructed later
                    hiToEnPayload[`element_${key}`] = element.value;
                }
            }
        }

        if (Object.keys(hiToEnPayload).length === 0) return {};

        try {
            console.log("Translating Hindi to English (Async)...", Object.keys(hiToEnPayload));
            const translatedFlat = await this.callGemini(hiToEnPayload, "Hindi", "English");

            // Reconstruct
            const finalResult = {};
            const elementContentTranslated = {};

            for (const [key, value] of Object.entries(translatedFlat)) {
                if (key.startsWith('element_')) {
                    const originalKey = key.replace('element_', '');
                    // We are creating the EN version. The source had structure. We keep it.
                    if (sourceElements[originalKey]) {
                        elementContentTranslated[originalKey] = {
                            ...sourceElements[originalKey],
                            value: value
                        };
                    }
                } else {
                    finalResult[key] = value;
                }
            }

            // Store result in elementContent_en (as it's the EN version)
            // Note: If source was also elementContent_en, we are effectively overwriting/updating it in the new copy.
            if (Object.keys(elementContentTranslated).length > 0) {
                finalResult.elementContent_en = elementContentTranslated; // Destination is always _en for English
            }

            return finalResult;

        } catch (error) {
            console.error("Translation error:", error);
            return {};
        }
    }

    /**
     * Helper to call Gemini API
     */
    async callGemini(payload, sourceLang, targetLang) {
        const checkPrompt = `
You are a professional news translator for a Digital Jagaran CMS.
Translate the values in the following JSON object from ${sourceLang} to ${targetLang}.
Return ONLY the raw JSON object. Do not include markdown code blocks (like \`\`\`json).

Rules:
1. Maintain the exact keys of the JSON object.
2. For arrays (keywords, tags), translate each item.
3. For 'body' or content fields, preserve any HTML tags or Markdown formatting.
4. Use a formal, journalistic tone appropriate for news articles.
5. Ensure the translation is sensible and contextually accurate.
6. For keys starting with 'element_', these are fragments of a larger layout. Translate their content contextually.

Input JSON:
${JSON.stringify(payload)}
`;

        try {
            const result = await this.model.generateContent(checkPrompt);
            const response = await result.response;
            const text = response.text();

            // Clean up if Gemini returns markdown code blocks despite instructions
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanedText);
        } catch (error) {
            console.error(`Gemini API Failed for ${sourceLang}->${targetLang}:`, error);
            throw error;
        }
    }
}

module.exports = new TranslationService();
