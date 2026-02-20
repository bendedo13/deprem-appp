/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#e00700",
                dark: {
                    DEFAULT: "#230f0f",
                    surface: "#1e0d0d",
                    border: "#3d1a1a",
                },
            },
        },
    },
    plugins: [],
}
