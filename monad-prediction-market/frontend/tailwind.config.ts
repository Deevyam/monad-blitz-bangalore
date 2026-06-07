import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Redefined for Outcrowd Zentra Light Theme Dashboard
        monad: {
          purple: "#5F45FF", // Vibrant royal blue-purple
          coral: "#FF5656",  // Crisp coral red
          ink: "#F4F6F9",    // Light slate background
          panel: "#FFFFFF",  // Pure white card background
          border: "#EAEFF4", // Soft grey border lines
        },
      },
      boxShadow: {
        'premium': '0 8px 30px rgb(0,0,0,0.03)',
        'premium-hover': '0 12px 40px rgb(0,0,0,0.06)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
