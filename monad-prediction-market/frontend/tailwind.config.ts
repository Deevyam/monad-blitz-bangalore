import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Monad-flavored palette
        monad: {
          purple: "#836EF9",
          coral: "#FB7185",
          ink: "#0B0B1A",
          panel: "#15152B",
          border: "#26264A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
