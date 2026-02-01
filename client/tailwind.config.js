/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    red: '#d91f27', // Typical news red
                    dark: '#1a1a1a',
                    gray: '#f5f5f5'
                }
            },
            fontFamily: {
                serif: ['Merriweather', 'serif'],
                sans: ['Inter', 'sans-serif'],
                // Hindi Typography
                halant: ['Halant', 'serif'],
                anek: ['"Anek Devanagari"', 'sans-serif'],
                tiro: ['"Tiro Devanagari Hindi"', 'serif'],
                hind: ['Hind', 'sans-serif'],
                yantra: ['Yantramanav', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
