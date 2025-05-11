/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "rich-black": "#0c1618",
        "orange-peel": "#ffa630",
        "brunswick-green": "#004643",
        celadon: "#98c9a3",
        bittersweet: "#ff5a5f",
      },
    },
  },
  plugins: [],
};
