/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0F13",
        panel: "#16181F",
        panel2: "#1D2029",
        line: "#282C36",
        mist: "#8A8F9C",
        paper: "#EDEFF4",
        signal: "#5B8CFF",
        signal2: "#8B6BFF",
        good: "#3FD68C",
        bad: "#FF6B6B",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        xl2: "1.1rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(91,140,255,0.25), 0 8px 30px rgba(91,140,255,0.12)",
      },
    },
  },
  plugins: [],
};
