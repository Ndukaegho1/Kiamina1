/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        '64': '16rem',
      },
      colors: {
        primary: {
          DEFAULT: '#153585',
          light: '#1E4499',
          dark: '#0F244D',
          tint: 'rgba(21, 53, 133, 0.08)',
        },
        background: '#F4F5F7',
        sidebar: '#FFFFFF',
        card: '#FFFFFF',
        'text-primary': '#1A1D21',
        'text-secondary': '#5E6368',
        'text-muted': '#8A8F94',
        border: '#E3E5E8',
        'border-light': '#F0F1F2',
        success: '#0D7D4D',
        'success-bg': '#E8F5EE',
        warning: '#B86E00',
        'warning-bg': '#FFF4E5',
        error: '#C92A2A',
        'error-bg': '#FFE8E8',
        info: '#153585',
        'info-bg': '#E8EEFF',
      },
      fontFamily: {
        sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
