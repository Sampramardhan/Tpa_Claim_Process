/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8ff',
          100: '#d8efff',
          200: '#b0dfff',
          500: '#1876d2',
          600: '#145fb0',
          700: '#164c8c',
        },
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6b7280',
        },
      },
      boxShadow: {
        shell: '0 18px 45px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
