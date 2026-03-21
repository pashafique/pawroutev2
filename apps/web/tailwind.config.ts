import type { Config } from 'tailwindcss';
import { tailwindTheme } from '@pawroute/config';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: tailwindTheme,
  plugins: [],
};

export default config;
