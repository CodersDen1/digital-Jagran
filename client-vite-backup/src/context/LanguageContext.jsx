import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('HN'); // 'en' or 'HN'

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'HN' : 'en');
    };

    const t = (article, field) => {
        if (!article) return '';

        const hasValue = (val) => {
            if (val === null || val === undefined) return false;
            if (Array.isArray(val)) return val.length > 0;
            if (typeof val === 'string') return val.trim().length > 0;
            return true;
        };

        if (language === 'en') {
            const enVal = article[`${field}_en`];
            if (hasValue(enVal)) return enVal;

            const defaultVal = article[field];
            if (hasValue(defaultVal)) return defaultVal;

            return '';
        } else {
            // Language is 'HN'
            const defaultVal = article[field];
            if (hasValue(defaultVal)) return defaultVal;

            const enVal = article[`${field}_en`];
            if (hasValue(enVal)) return enVal;

            return '';
        }
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
