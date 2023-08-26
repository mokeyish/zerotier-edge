import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,css,md,mdx,html,json,scss}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      '--btn-text-case': 'unset'
    },
  },
  daisyui: {
    themes: [
      {
        "light": {
          ...require("daisyui/src/theming/themes")["[data-theme=winter]"],
          // "--btn-text-case": "none",
          // "--rounded-btn": "3px"
        }
      }
      , "dark", "cupcake"],
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui")
  ],
};

export default config;
