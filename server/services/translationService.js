class TranslationService {
    /**
     * Simulates translation from English to Hindi.
     * In a real app, this would call Google Translate API or Microsoft Translator.
     * For this prototype, it appends "(Hindi)" to string fields or provides dummy Hindi text.
     */
    async translateArticle(data) {
        const translated = { ...data };

        if (data.article_header_en && !data.article_header) {
            translated.article_header = `(Translated) ${data.article_header_en}`;
        }

        if (data.summary_en && !data.summary) {
            translated.summary = `(Hindi Summary) ${data.summary_en}`;
        }

        if (data.body_en && !data.body) {
            // Very basic mock translation for body
            translated.body = `[Hindi Body Placeholder] ${data.body_en}`;
        }

        if (data.metadata_en && !data.metadata) {
            translated.metadata = `(Hindi Meta) ${data.metadata_en}`;
        }

        if (data.keywords_en && (!data.keywords || data.keywords.length === 0)) {
            translated.keywords = data.keywords_en.map(k => `${k}-hi`);
        }

        if (data.tags_en && (!data.tags || data.tags.length === 0)) {
            translated.tags = data.tags_en.map(t => `${t}-hi`);
        }

        return translated;
    }
}

module.exports = new TranslationService();
