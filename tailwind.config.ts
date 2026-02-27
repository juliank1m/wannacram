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
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "var(--ink)",
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        "px-blue": "var(--px-blue)",
        "px-yellow": "var(--px-yellow)",
        "px-green": "var(--px-green)",
        "px-red": "var(--px-red)",
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        vt323: ["var(--font-vt323)", "monospace"],
        pixelify: ["var(--font-pixelify)", "monospace"],
      },
      boxShadow: {
        pixel: "4px 4px 0px var(--ink)",
        "pixel-sm": "3px 3px 0px var(--ink)",
        "pixel-lg": "6px 6px 0px var(--ink)",
        "pixel-blue": "4px 4px 0px var(--px-blue)",
        "pixel-green": "4px 4px 0px var(--px-green)",
        "pixel-red": "4px 4px 0px var(--px-red)",
        "pixel-yellow": "4px 4px 0px var(--px-yellow)",
      },
    },
  },
  plugins: [],
};
export default config;
