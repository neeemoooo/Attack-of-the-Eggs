/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./index.html","./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      backgroundImage:{
        keyBg:"radial-gradient(#464646,#0F0F0F)",
        mainBg:"url('../images/mainBg.png')"
      },      
      fontFamily:{
        mainFont:["Cinzel Decorative","serif"],
      }
    },
  },
  plugins: [],
}