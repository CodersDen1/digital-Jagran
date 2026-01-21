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

        if (Object.keys(enToHiPayload).length === 0) return {};

        try {
            console.log("Translating English to Hindi (Async)...", Object.keys(enToHiPayload));
            return await this.callGemini(enToHiPayload, "English", "Hindi");
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
