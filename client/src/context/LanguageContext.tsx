'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'en' | 'HN';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (article: any, field: string) => string; // Keeping 'any' for article for now, or define Article interface later
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>('HN'); // Default to Hindi

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'HN' : 'en');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (article: any, field: string) => {
        if (!article) return '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasValue = (val: any) => {
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

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
