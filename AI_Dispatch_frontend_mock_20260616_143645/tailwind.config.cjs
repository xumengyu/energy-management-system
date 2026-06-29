/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    // ✅ 只扫描项目源码，避免误扫 node_modules 导致性能问题
    "./index.{ts,tsx,js,jsx}",
    "./App.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
