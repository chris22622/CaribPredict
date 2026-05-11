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
        cp: {
          page: "#F1ECDE",
          'page-2': "#EBE5D2",
          card: "#FFFFFF",
          'card-sub': "#FAF7EE",
          line: "#E4DEC9",
          'line-strong': "#D6CFB7",
          ink: "#0B1F2E",
          'ink-2': "#102A3D",
          'ink-3': "#1B3A50",
          'ink-line': "#21425A",
          text: "#14181F",
          'text-2': "#4A5260",
          'text-3': "#7B8390",
          yes: "#0E7C66",
          'yes-soft': "#DCEEE8",
          'yes-ink': "#08412F",
          no: "#D24A3A",
          'no-soft': "#FBE3DC",
          'no-ink': "#6E1D13",
          sun: "#E8A53C",
          'sun-soft': "#F7E7C1",
        },
        caribbean: {
          blue: "#1570EF",
          navy: "#0A1628",
          teal: "#00B4D8",
          green: "#06D6A0",
          coral: "#FF6B6B",
          sand: "#F9FAFB",
          gray: {
            50: "#F9FAFB",
            100: "#F3F4F6",
            200: "#E5E7EB",
            300: "#D1D5DB",
            400: "#9CA3AF",
            500: "#6B7280",
            600: "#4B5563",
            700: "#374151",
            800: "#1F2937",
            900: "#111827",
          },
        },
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 0 rgba(20,24,31,.04), 0 1px 2px rgba(20,24,31,.04)',
        'card-hover': '0 6px 14px rgba(20,24,31,.08), 0 2px 4px rgba(20,24,31,.05)',
        'pop': '0 18px 40px rgba(11,31,46,.18), 0 6px 14px rgba(11,31,46,.10)',
      },
    },
  },
  plugins: [],
};
export default config;
