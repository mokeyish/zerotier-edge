import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,css,md,mdx,html,json,scss}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      '--btn-text-case': 'unset'
    },
  },
  daisyui: {
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['[data-theme=bumblebee]'],
        }
      },
      {
        dark: {
          ...require('daisyui/src/theming/themes')['[data-theme=luxury]'],
        }
      },
    ],
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui")
  ],
};

export default config;
