import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en'); // 'en' or 'hi'

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'hi' : 'en');
    };

    const t = (article, field) => {
        if (!article) return '';
        // If language is 'en', prefer field_en, else field.
        // However, my schema has `article_header_en` and `article_header`.
        // If language is 'hi', we want `article_header`.
        // If language is 'en', we want `article_header_en`.

        // Also handle fallback if translation missing.
        if (language === 'en') {
            return article[`${field}_en`] || article[field] || '';
        } else {
            return article[field] || article[`${field}_en`] || '';
        }
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
