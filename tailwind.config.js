/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vodacom: '#e11d48',
        mtn: '#fbbf24',
        telkom: '#0ea5e9',
        cellc: '#10b981'
      }
    }
  },
  plugins: [],
}

