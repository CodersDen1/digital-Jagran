import { createApi } from './transport.js';
export const api = createApi({ origin: import.meta.env.VITE_NEWS_API_ORIGIN || '',
  onUnauthorized: () => window.dispatchEvent(new Event('newsroom-session-expired')) });
export const publicUrl = (path = '/en') => `${(import.meta.env.VITE_PUBLIC_ORIGIN || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '')}${path}`;
export const sections = [
  "india",
  "world",
  "politics",
  "business",
  "technology",
  "sports",
  "culture",
  "explained",
];
export const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : "Not published";
export const storyTitle = (a) =>
  a.translations?.en?.title || a.translations?.hi?.title || "Untitled story";
