/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"DM Sans"', 'sans-serif'],
                display: ['"Syne"', 'sans-serif'],
            },
            colors: {
                primary: "#f97316", // orange-500
                dark: {
                    DEFAULT: "#030712", // gray-950
                    surface: "#111827", // gray-900
                    border: "#1f2937", // gray-800
                },
            },
            animation: {
                fadeIn: 'fadeIn 0.5s ease-out',
                slideDown: 'slideDown 0.5s ease-out',
                scaleIn: 'scaleIn 0.3s ease-out',
                pulseRing: 'pulseRing 2s cubic-bezier(0.24, 0, 0.38, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                pulseRing: {
                    '0%': { transform: 'scale(0.8)', opacity: '0.5' },
                    '100%': { transform: 'scale(1.2)', opacity: '0' },
                },
            },
        },
    },
    plugins: [],
}
