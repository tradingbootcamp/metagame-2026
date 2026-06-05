/** @type {import("prettier").Config} */
const config = {
  // sorts Tailwind class names; needs the v4 CSS entry point to resolve the theme
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/app/globals.css",
};

export default config;
