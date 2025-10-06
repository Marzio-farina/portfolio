const themes = require('daisyui/src/theming/themes');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'media',
  theme: { 
    extend: {}
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: false,
  },
};