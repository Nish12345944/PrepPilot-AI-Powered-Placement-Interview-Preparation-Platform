/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      animation: {
        'bounce': 'bounce 1s infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
  safelist: [
    { pattern: /^(bg|text|border)-(green|red|yellow|blue|purple)-(400|500|300|200)/ },
    { pattern: /^(bg|text|border)-(green|red|yellow|blue|purple)-500\/(10|20|30)/ },
  ],
};
