import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#6d5dfc", soft: "#eeecff" },
      },
    },
  },
  plugins: [],
} satisfies Config;
