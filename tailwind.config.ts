import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Include all files in src
    './public/**/*.html', // Include any HTML files in public
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: '#2563eb',
        secondary: '#6b7280',
        accent: '#10b981',
        background: '#f9fafb',
        foreground: '#111827',
      },
    },
  },
  plugins: [],
}

export default config
