/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: { extend: {} },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'], // puoi aggiungere altri temi Daisy (e.g. "cupcake", "business", ecc.)
  },
};