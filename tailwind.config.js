module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './js/**/*.js',
    './css/**/*.css'
  ],
  plugins: [
    require('tailwind-scrollbar')
  ],
  // ...其他配置...
};