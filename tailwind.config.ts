import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette Doré
        fond: "#151009",
        surface: "#1F1710",
        surface2: "#2A1F14",
        accent: "#E4A93F",
        "accent-clair": "#F3C96B",
        "sur-accent": "#151009",
        secondaire: "#C24E2A",
        texte: "#F3EADA",
        texte2: "#B7A88F",
      },
      fontFamily: {
        "bricolage": ["var(--font-bricolage)", "sans-serif"],
        "instrument": ["var(--font-instrument)", "sans-serif"],
        "space": ["var(--font-space)", "monospace"],
      },
      borderColor: {
        ligne: "rgba(228, 169, 63, 0.16)",
      },
      boxShadow: {
        ombre: "0 18px 48px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
