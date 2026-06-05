export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        yellow: { DEFAULT: '#F5C518', soft: '#FFE082', tint: '#FFF6D0' },
        cream: '#FFFBEB',
        red: { DEFAULT: '#D8233E', deep: '#B01A30' },
        ink: { DEFAULT: '#2C2A29', 2: '#4B4845', 3: '#807C77' },
        line: { DEFAULT: '#E8E2D2', 2: '#D9D2BD' },
        ok: '#1F8A5B',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(44,42,41,.06), 0 1px 1px rgba(44,42,41,.04)',
        md: '0 8px 24px rgba(44,42,41,.10), 0 2px 6px rgba(44,42,41,.06)',
        lg: '0 30px 80px rgba(44,42,41,.18), 0 8px 24px rgba(44,42,41,.10)',
      },
    },
  },
  plugins: [],
}
