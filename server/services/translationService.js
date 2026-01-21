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
        // Create a copy to modify
        const translated = { ...data };

        // 1. Check for English -> Hindi missing fields
        const enToHiPayload = {};
        if (data.article_header_en && !data.article_header) enToHiPayload.article_header = data.article_header_en;
        if (data.summary_en && !data.summary) enToHiPayload.summary = data.summary_en;
        if (data.body_en && !data.body) enToHiPayload.body = data.body_en;
        if (data.metadata_en && !data.metadata) enToHiPayload.metadata = data.metadata_en;
        if (data.keywords_en && (!data.keywords || data.keywords.length === 0)) enToHiPayload.keywords = data.keywords_en;
        if (data.tags_en && (!data.tags || data.tags.length === 0)) enToHiPayload.tags = data.tags_en;

        // 2. Check for Hindi -> English missing fields
        const hiToEnPayload = {};
        if (data.article_header && !data.article_header_en) hiToEnPayload.article_header_en = data.article_header;
        if (data.summary && !data.summary_en) hiToEnPayload.summary_en = data.summary;
        if (data.body && !data.body_en) hiToEnPayload.body_en = data.body;
        if (data.metadata && !data.metadata_en) hiToEnPayload.metadata_en = data.metadata;
        if (data.keywords && (!data.keywords_en || data.keywords_en.length === 0)) hiToEnPayload.keywords_en = data.keywords;
        if (data.tags && (!data.tags_en || data.tags_en.length === 0)) hiToEnPayload.tags_en = data.tags;

        try {
            // Execute translations if needed
            if (Object.keys(enToHiPayload).length > 0) {
                console.log("Translating English to Hindi...", Object.keys(enToHiPayload));
                const hiTranslations = await this.callGemini(enToHiPayload, "English", "Hindi");
                Object.assign(translated, hiTranslations);
            }

            if (Object.keys(hiToEnPayload).length > 0) {
                console.log("Translating Hindi to English...", Object.keys(hiToEnPayload));
                const enTranslations = await this.callGemini(hiToEnPayload, "Hindi", "English");
                Object.assign(translated, enTranslations);
            }
        } catch (error) {
            console.error("Translation error:", error);
            // Fallback or just return partial data if translation fails
        }

        return translated;
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
