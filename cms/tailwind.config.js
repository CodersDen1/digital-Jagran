/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#1e3a8a', // Dark Blue - Professional
                secondary: '#64748b',
                accent: '#0f172a',
            }
        },
    },
    plugins: [],
}
