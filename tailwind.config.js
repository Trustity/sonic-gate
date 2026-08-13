/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        lab: {
          bg: "#050607",
          elevated: "#0c0e10",
          card: "#0a0c0e",
          border: "rgba(61, 255, 138, 0.14)",
          "border-strong": "rgba(61, 255, 138, 0.28)",
          accent: "#3dff8a",
          muted: "#7a857a",
          dim: "#4a524a",
          navy: "#0a1224",
        },
      },
      fontFamily: {
        sans: ['"Syne"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        accent: "0 0 18px rgba(61, 255, 138, 0.35)",
      },
    },
  },
  plugins: [],
};
