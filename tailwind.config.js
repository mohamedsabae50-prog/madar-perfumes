/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#090204',
        cosmic: '#140409',
        surface: '#1D070E',
        burgundy: '#581528',
        burgundyGlow: '#7A1C37',
        cream: '#F2E9DF',
        champagne: '#D5BFA8',
        muted: '#A8958B',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(242, 233, 223, 0.12), 0 25px 80px rgba(88, 21, 40, 0.45)',
      },
      backgroundImage: {
        cosmic: 'radial-gradient(circle at top, rgba(122,28,55,0.35), transparent 35%), linear-gradient(135deg, rgba(9,2,4,1), rgba(29,7,14,1))',
      },
    },
  },
  plugins: [],
}
