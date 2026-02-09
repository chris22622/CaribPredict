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
        caribbean: {
          blue: "#0077BE",
          teal: "#00B4D8",
          sand: "#F4E4C1",
          coral: "#FF6B6B",
          green: "#06D6A0",
          navy: "#023047",
        },
      },
    },
  },
  plugins: [],
};
export default config;
