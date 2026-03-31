/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',         // Deep navy (primary)
        teal: '#10B981',        // CTA / active / success accent
        'teal-dark': '#059669', // Hover on teal
        gold: '#B8973A',        // Keep — used in doc-preview section headers
        'app-bg': '#F8F9FB',    // Page background
        cream: '#FDFCF9',       // Legacy compat
      },
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', '"Roboto Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
