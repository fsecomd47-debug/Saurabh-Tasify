/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          primary: '#5E5CE6',
          secondary: '#4A48C9',
          accent: '#7A78FF',
        },
        asset: {
          gain: '#34C759',
          loss: '#FF3B30',
        },
        slate: {
          50: '#F2F2F7',
          100: '#E5E5EA',
          200: '#D1D1D6',
          300: '#C7C7CC',
          400: '#8E8E93',
          500: '#636366',
          600: '#48484A',
          700: '#3A3A3C',
          800: '#2C2C2E',
          900: '#1C1C1E',
        },
      },
      fontFamily: {
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        ui: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        '5xl': '28px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
        'vault': '0 4px 16px rgba(94,92,230,0.25)',
        'fab': '0 4px 16px rgba(94,92,230,0.35)',
        'nav': '0 -1px 12px rgba(0,0,0,0.04)',
        'button': '0 2px 8px rgba(0,0,0,0.06)',
        'soft': '0 1px 4px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
